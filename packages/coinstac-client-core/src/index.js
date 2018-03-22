'use strict';

// app package deps
const tail = require('lodash/tail');
const bluebird = require('bluebird');
const csvParse = require('csv-parse');
const mkdirp = bluebird.promisify(require('mkdirp'));
const util = require('util');
const fs = require('fs');

const unlinkAsync = util.promisify(fs.unlink);
const linkAsync = util.promisify(fs.link);
const statAsync = bluebird.promisify(fs.stat);

bluebird.config({ warnings: false });
const osHomedir = require('os-homedir');
const path = require('path');
const winston = require('winston');

const Logger = winston.Logger;
const Console = winston.transports.Console;
const ComputationRegistry = require('coinstac-computation-registry');
const PipelineManager = require('coinstac-pipeline');

/**
 * Create a user client for COINSTAC
 * @example <caption>construction and initialization</caption>
 * const client = new CoinstacClient();
 * client.initialize((err) => {
 *   if (err) { throw err; }
 *   client.logger.info('Success! I’ve initialized!');
 * });
 *
 * @class
 * @constructor
 * @param {object} opts
 * @property {string} [opts.appDirectory] Path to on-disk storage. Primarily
 * used for testing.
 * @param {Winston} [opts.logger] permit user injected logger vs default logger
 * @param {string} [opts.logLevel] npm log levels, e.g. 'verbose', 'error', etc
 * @param {string} [opts.userId] Currently logged-in user
 * @property {Winston} logger
 * @property {string} appDirectory
 * @property {Auth} auth
 * @property {Project} project
 */
class CoinstacClient {
  constructor(opts) {
    if (!opts || !(opts instanceof Object)) {
      throw new TypeError('coinstac-client requires configuration opts');
    }
    this.logger = opts.logger || new Logger({ transports: [new Console()] });
    this.appDirectory = opts.appDirectory ||
      CoinstacClient.getDefaultAppDirectory();

    // hack for electron-remote. generate full API, even if it's dead.
    this.computationRegistry = new ComputationRegistry({});

    /* istanbul ignore if */
    if (opts.logLevel) {
      this.logger.level = opts.logLevel;
    }

    this.clientId = opts.userId;

    this.pipelineManager = PipelineManager.create({
      mode: 'local',
      clientId: opts.userId,
      operatingDirectory: path.join(this.appDirectory),
      remotePort: opts.pipelineWSServer.port,
      remoteProtocol: opts.pipelineWSServer.protocol,
      remotePathname: opts.pipelineWSServer.pathname,
      remoteURL: opts.pipelineWSServer.hostname,
    });
  }

  /**
   * Get a metadata CSV's contents.
   *
   * @param {string} filename Full file path to CSV
   * @returns {Promise<Project>}
   */
  static getCSV(filename) {
    return bluebird.promisify(fs.readFile)(filename)
      .then(data => bluebird.promisify(csvParse)(data.toString()))
      .then(JSON.stringify);
  }

  /**
   * Get the default application storage directory.
   *
   * @returns {string}
   */
  static getDefaultAppDirectory() {
    return path.join(osHomedir(), '.coinstac');
  }

  /**
   * Load a metadata CSV file.
   *
   * @param {string} metaFilePath Path to metadata CSV
   * @param {Array[]} metaFile Metadata CSV's contents
   * @returns {File[]} Collection of files
   */
  static getFilesFromMetadata(metaFilePath, metaFile) {
    return tail(metaFile).map(([filename]) => (
      path.isAbsolute(filename) ?
        filename :
        path.resolve(path.join(path.dirname(metaFilePath), filename))
    ));
  }

  /**
   * Get JSON schema contents.
   *
   * @param {string} filename Full file path to JSON Schema
   * @returns {Promise<Project>}
   */
  static getJSONSchema(filename) {
    return bluebird.promisify(fs.readFile)(filename)
      .then(data => JSON.parse(data.toString()));
  }

  /**
   * Get array of file paths recursively
   *
   * @param {object} group
   * @param {array} group.paths the paths to traverse
   * @param {string} group.parentDir parent directory if diving into subdir
   * @param {string} group.error present if error found
   */
  static getSubPathsAndGroupExtension(group) {
    let pathsArray = [];
    let extension = null;

    // Empty subdirectory
    if (group.paths.length === 0) {
      return null;
    }

    // Return error
    if (group.error) {
      return group;
    }

    // Iterate through all paths
    for (let i = 0; i < group.paths.length; i += 1) {
      let p = group.paths[i];

      // Combine path with parent dir to get absolute path
      if (group.parentDir) {
        p = group.parentDir.concat(`/${p}`);
      }

      const stats = fs.statSync(p);

      if (stats.isDirectory()) {
        // Recursively retrieve path contents of directory
        const subGroup = this.getSubPathsAndGroupExtension({
          paths: [...fs.readdirSync(p).filter(item => !(/(^|\/)\.[^\/\.]/g).test(item))], // eslint-disable-line no-useless-escape
          extension: group.extension,
          parentDir: p,
        });

        if (subGroup) {
          if (subGroup.error) {
            return subGroup;
          }

          if (extension && subGroup.extension && extension !== subGroup.extension) {
            return { error: `Group contains multiple extensions - ${extension} & ${subGroup.extension}.` };
          }

          extension = subGroup.extension;
          pathsArray = pathsArray.concat(subGroup.paths);
        }
      } else {
        const thisExtension = path.extname(p);

        if ((group.extension && thisExtension !== group.extension) ||
            (extension && extension !== thisExtension)) {
          return { error: `Group contains multiple extensions - ${thisExtension} & ${group.extension ? group.extension : extension}.` };
        }

        extension = thisExtension;
        pathsArray.push(p);
      }
    }

    return { paths: pathsArray, extension };
  }

  /**
   * Validate client pipeline against run pipeline snapshot before link data files
   *
   * TODO: Create cleanup function to unlink files after run
   *
   * @param {string} consortiumId The id of the consortium running this pipeline
   * @param {*} clientPipeline The client's copy of the consortium's active pipeline
   * @param {*} filesArray An array of all the files used by the client's data mapping
   *                        for this pipeline
   * @param {*} runId The id if this particular pipeline run
   * @param {*} runPipeline The run's copy of the current pipeline
   */
  startPipeline(
    clients,
    consortiumId,
    clientPipeline,
    filesArray,
    runId,
    runPipeline // eslint-disable-line no-unused-vars
  ) {
    return mkdirp(path.join(this.appDirectory, this.clientId, runId))
    .then(() => {
      // TODO: validate runPipeline against clientPipeline
      const linkPromises = [];

      for (let i = 0; i < filesArray.length; i += 1) {
        linkPromises.push(
          linkAsync(filesArray[i], `${this.appDirectory}/${this.clientId}/${runId}/${filesArray[i].replace(/\//g, '-')}`)
        );
      }

      const runObj = { spec: clientPipeline, runId };
      if (clients) {
        runObj.clients = clients;
      }

      const newPipeline = this.pipelineManager.startPipeline(runObj);

      return Promise.all([newPipeline, linkPromises]);
    });
  }

  unlinkFiles(runId) {
    const fullPath = path.join(this.appDirectory, this.clientId, runId);

    return statAsync(fullPath).then((stats) => {
      return stats.isDirectory();
    })
    .then((exists) => {
      if (!exists) {
        return [];
      }

      return new Promise((res, rej) => {
        return fs.readdir(fullPath,
          (error, filesArray) => {
            if (error) {
              rej(error);
            } else {
              res(filesArray);
            }
          }
        );
      });
    })
    .then((filesArray) => {
      const unlinkPromises = [];
      for (let i = 0; i < filesArray.length; i += 1) {
        unlinkPromises.push(
          unlinkAsync(path.resolve(fullPath, filesArray[i]))
        );
      }
      return Promise.all(unlinkPromises);
    });
  }
}

module.exports = CoinstacClient;
