'use strict';

const mkdirp = require('mkdirp-promise');
const path = require('path');
const touch = require('touch');
const winston = require('winston');

/**
 * @module service/logger
 *
 * {@link https://www.npmjs.com/package/winston}
 */

/**
 * Log file directory.
 *
 * @const {string}
 */
const LOG_DIR = '/var/log/coinstac';

/**
 * Log file name.
 *
 * @const {string}
 */
const LOG_BASE = 'application.log';

/**
 * Logger instance.
 *
 * @type {winston.Logger}
 */
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      level: 'info',
    }),
  ],
});

/**
 * Set up file transport async. If an error occurs the executable will catch the
 * unhandled rejection and shut the server down.
 */
mkdirp(LOG_DIR)
  .then(() => {
    return new Promise((resolve, reject) => {
      touch(path.join(LOG_DIR, LOG_BASE), error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  })
  .then(() => {
    logger.add(winston.transports.File, {
      filename: path.join(LOG_DIR, LOG_BASE),
      level: 'silly',
      silent: false,
    });
  });

module.exports = logger;
