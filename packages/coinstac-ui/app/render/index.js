/* eslint-disable react/jsx-filename-extension */
import React from 'react';
import { render } from 'react-dom';
import { hashHistory } from 'react-router';
import { ipcRenderer } from 'electron';

import configureStore from './state/store';
import { start as startErrorHandling } from './utils/boot/configure-error-handling';

import Root from './containers/root';

require('babel-polyfill');

// Set up root paths
require('../common/utils/add-root-require-path.js');

// Boot up the render process
startErrorHandling();

// load application stylesheets
require('./styles/app.scss');

const rootEl = document.getElementById('app');
const store = configureStore();

render(
  <Root history={hashHistory} store={store} />,
  rootEl
);

ipcRenderer.send('write-log', { type: 'info', message: 'renderer process up' });

if (module.hot) {
  module.hot.accept('./containers/root', () => {
    /* eslint-disable global-require */
    const NextRoot = require('./containers/root').default;
    /* eslint-enable global-require */
    render(
      <NextRoot history={hashHistory} store={store} />,
      rootEl
    );
  });
}
