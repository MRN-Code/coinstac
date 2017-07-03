'use strict';

/**
 * @module simulator
 */
require('./utils/handle-errors');

const { fill, flatten, omit, noop, times, uniqueId, values } = require('lodash');
const bluebird = require('bluebird');
const fs = require('fs');
const path = require('path');

const bootLocals = require('./boot-locals');
const bootRemote = require('./boot-remote');
const dbServer = require('./db-server');
const fileLoader = require('./file-loader');
const { logger } = require('./utils/logging');

/**
 * Processes.
 *
 * Storage for child processes.
 *
 * @const {Object}
 * @property {(ChildProcess|null)} db
 * @property {(ChildProcess[]|null)} localhost
 * @property {(ChildProcess|null)} remote
 */
const processes = {
  local: null,
  remote: null,
};

const exportList = {
  /**
   * Get a declaration object.
   * @private
   *
   * @param {string} declarationPath
   * @returns {Promise} Resolves to a declaration object
   */
  getDeclaration(declarationPath) {
    if (typeof declarationPath !== 'string') {
      return Promise.reject(new Error('Requires a declaration path string'));
    }

    return bluebird.promisify(fs.stat)(declarationPath)
      .then((stats) => {
        if (!stats.isFile() && !stats.isDirectory()) {
          throw new Error(`Couldn't find declaration ${declarationPath}`);
        }

        /* eslint-disable global-require, import/no-dynamic-require */
        const declaration = require(declarationPath);
        /* eslint-enable global-require, import/no-dynamic-require */

        // Validate declaration's shape
        if (
          !('computationPath' in declaration) ||
          typeof declaration.computationPath !== 'string'
        ) {
          throw new Error(
            `Expected declaration ${declarationPath} to have a 'computationPath' property`
          );
        } else if (!(declaration instanceof Object)) {
          throw new Error(`Expected declaration ${declarationPath} to be an object`);
        } else if (!Array.isArray(declaration.local)) {
          throw new Error(
            `Expected declaration ${declarationPath} to have a 'local' array`
          );
        } else if (
          'remote' in declaration && !(declaration.remote instanceof Object)
        ) {
          throw new Error(
            `Expected declaration ${declarationPath} 'remote' value to be an object.`
          );
        }

        // Support empty arrays created by `Array(<number>)`
        const local = declaration.local.every(l => typeof l === 'undefined') ?
          times(declaration.local.length, () => ({})) :
          Promise.all(declaration.local.map(item => (
            item instanceof Object ? bluebird.props(item) : item
          )));

        const remote = declaration.remote ?
          bluebird.props(declaration.remote) :
          undefined;

        // Pass local and remote immediately to handle rejections
        return Promise.all([
          local,
          remote,
          omit(declaration, ['local', 'remote']),
        ]);
      })
      .then(([local, remote, declaration]) => {
        if (!local.length) {
          throw new Error(
            `Expected declaration ${declarationPath} to have items in 'local' array`
          );
        } else if (!Array.isArray(declaration.__ACTIVE_COMPUTATION_INPUTS__)) {
          /**
           * @todo Don't require computation inputs.
           *
           * {@link https://github.com/MRN-Code/coinstac/issues/161}
           */
          /* eslint-disable max-len */
          throw new Error(
            `Expected declaration ${declarationPath} to contain '__ACTIVE_COMPUTATION_INPUTS__' array`
          );
          /* eslint-enable max-len */
        }


        return {
          activeComputationInputs: declaration.__ACTIVE_COMPUTATION_INPUTS__,
          computationPath: path.resolve(
            path.dirname(require.resolve(declarationPath)),
            declaration.computationPath
          ),
          local,
          remote,
          verbose: !!declaration.verbose,
        };
      });
  },

  /**
   * Get mock usernames for simulation run.
   * @private
   *
   * @param {number} count
   * @returns {string[]}
   */
  getUsernames(count) {
    return fill(Array(count), 'testUser').map(uniqueId);
  },

  /**
   * Run simulation.
   *
   * @description Boots the infrastructure required to run a simulation and runs
   * it.
   *
   * @param {string} declPath simulation declaration.
   * @returns {Promise}
   */
  run(declPath) {
    return this.getDeclaration(declPath)
      .then((declaration) => {
        const cwd = process.cwd();
        const usernames = this.getUsernames(declaration.local.length);

        process.chdir(path.resolve(__dirname, '..'));
        // ^because spawn-pouchdb-server makes naughty assumptions :/

        return Promise.all([
          cwd,
          declaration,
          usernames,
          dbServer.setup(),
        ]);
      })
      .then(([cwd, declaration, usernames]) => {
        process.chdir(cwd);

        return Promise.all([
          declaration,
          usernames,
          bootRemote.run({
            activeComputationInputs: declaration.activeComputationInputs,
            computationPath: declaration.computationPath,
            data: declaration.remote,
            usernames,
            verbose: declaration.verbose,
          }),
        ]);
      })
      .then(([declaration, usernames, remoteProcess]) => {
        processes.remote = remoteProcess;
        logger.info('Remote process booted');

        return bootLocals.run({
          computationPath: declaration.computationPath,
          users: declaration.local.map((data, i) => {
            return {
              data,
              username: usernames[i],
            };
          }),
          verbose: declaration.verbose,
        });
      })
      .then((localProcesses) => {
        processes.local = localProcesses;
        logger.info('Local processes booted');
        processes.local.forEach(proc => proc.send({ kickoff: true }));
        return this.teardown();
      });
  },

  /**
   * @private
   * @description tears down all processes. because `setup` both sets up and automatically
   * runs the simulation, teardown should be called immediately after setup
   * calls back.  this is generally unintuitive behavior.  please take note.
   * accepting PRs to break the run trigger out of the setup routing.
   * @returns {Promise}
   */
  teardown() {
    // teardown when computation cycle flagged as complete by
    // remote computation server (whom will exit on `complete`)
    return new Promise((resolve, reject) => {
      processes.remote.on('exit', () => {
        // kill all child processes cleanly after remote server has exited
        Promise.all(
          processes.local.map((proc, ndx) => { // eslint-disable-line
            return new Promise((res, rej) => {
              proc.on('message', (m) => {
                if (m.toredown) { return res(); }
                return rej(new Error('expected toredown message from child_process'));
              });
              proc.send({ teardown: true });
            });
          })
        )
        .then(dbServer.getRemoteResult)
        .then(remoteResult => Promise.all([
          remoteResult,
          dbServer.teardown(),
        ]))
        .then(([remoteResult]) => resolve(remoteResult))
        .catch(err => reject(err));
      });
    });
  },
};

// Ensure all processes are killed
process.on('exit', () => {
  dbServer.teardown().catch(noop);
  flatten(values(processes)).forEach(p => p && p.kill());
});

module.exports = Object.assign(exportList, fileLoader);
