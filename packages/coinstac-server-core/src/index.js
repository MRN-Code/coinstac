'use strict';

/**
 * @module server
 */
const computationRegistryService = require('./services/computation-registry');
const computationsDatabaseSyncer = require('./services/computations-database-syncer');
const dbRegistryService = require('./services/db-registry');
const remotePRPService = require('./services/remote-prp');
const seedConsortia = require('./services/seed-consortia');
const getSyncedDatabase = require('coinstac-common').utils.getSyncedDatabase;
const logger = require('./services/logger.js');

/**
 * Error handler for server errors, process `uncaughtException`s and
 * process `unhandledRejection`s.
 *
 * @param {Error} error
 * @param {Promise} [promise]
 */
function errorHandler(error, promise) {
  if (typeof promise === 'undefined') {
    logger.error('Server error', error);
  } else {
    logger.error('Server promise rejection', error, promise);
  }

  process.nextTick(() => process.exit(1));
}

process.on('uncaughtException', errorHandler);

process.on('unhandledRejection', errorHandler);

process.on('exit', () => {
  logger.info('Shutting down server…');
});

module.exports = {

  /**
   * exposes primary server components
   * @private
   * @returns {undefined}
   */
  exposeInternals() {
    this.computationRegistry = computationRegistryService.get();
    this.dbRegistry = dbRegistryService.get();
    this.pool = remotePRPService.pool;
  },

  /**
   *
   * Set up registries, initializers and listeners.
   *
   * @param {object} [config={}]
   * @param {(string|object[])} [config.seed] Whether or not to seed the database.
   * This only seeds if no documents exist in the `consortia` database. Pass
   * JSON as a string or a collection of document objects.
   * @param {string} [config.dbUrl] Database URL.
   * @param {boolean} [config.inMemory=false] Use an in-memory database using
   * instead of writing to disk.
   * @returns {Promise}
   */
  start(config) {
    /* istanbul ignore if */
    if (typeof config === 'undefined') {
      config = {}; // eslint-disable-line no-param-reassign
    }

    // init.
    // do all seed ops after pool init s.t. dbs are-likely-synced across the network
    return dbRegistryService.init(config)
      .then(() => computationRegistryService.init())
      .then(() => Promise.all([
        seedConsortia(config),
        getSyncedDatabase(dbRegistryService.get(), 'computations'),
        computationRegistryService.get().all(),
      ]))
      .then(
        ([, computationDatabase, decentralizedComputations]) =>
        computationsDatabaseSyncer.sync(
          computationDatabase,
          decentralizedComputations
        )
      )
      .then(() => remotePRPService.init())
      .then(() => this.exposeInternals())
      .then(() => this.pool);
  },

  /**
   * stop the server. teardown internal services.
   * @returns {Promise}
   */
  stop() {
    computationRegistryService.teardown();
    dbRegistryService.teardown();
    return remotePRPService.teardown();
  },
};
