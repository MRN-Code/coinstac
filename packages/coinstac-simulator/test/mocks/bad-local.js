'use strict';

module.exports = {
  /**
   * This property is used to pass computation input values from the
   * declaration into the computation.
   *
   * @todo Don't require `covariates` computation input
   *
   * {@link https://github.com/MRN-Code/coinstac/issues/161}
   */
  __ACTIVE_COMPUTATION_INPUTS__: [[[{
    name: 'Is Control',
    type: 'boolean',
  }]]],
  computationPath: './path/to/computation.js',
  local: [{
    x: Promise.resolve('hi'),
    y: Promise.reject('bye'), // eslint-disable-line prefer-promise-reject-errors
  }],
};
