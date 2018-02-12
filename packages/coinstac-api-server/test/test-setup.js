const rethink = require('rethinkdb');
const singleShot = require('./data/single-shot-schema');
const multiShot = require('./data/multi-shot-schema');
const vbm = require('./data/vbm-schema');
const decentralized = require('./data/coinstac-decentralized-test');
const local = require('./data/coinstac-local-test');
const helperFunctions = require('../src/auth-helpers');

helperFunctions.getRethinkConnection()
.then((connection) => {
  return rethink.dbList().contains('coinstac')
  .do((exists) => {
    return rethink.branch(
      exists,
      rethink.dbDrop('coinstac'),
      { dbs_dropped: 0 }
    );
  }).run(connection)
  .then(() => rethink.dbCreate('coinstac').run(connection))
  .then(() => rethink.tableCreate('pipelines').run(connection))
  .then(() => rethink.tableCreate('computations').run(connection))
  .then(() => rethink.table('computations').insert([
    Object.assign({}, local, { submittedBy: 'test' }),
    Object.assign({}, decentralized, { submittedBy: 'test' }),
    Object.assign({}, singleShot, { submittedBy: 'test' }),
    Object.assign({}, multiShot, { submittedBy: 'test' }),
    Object.assign({}, vbm, { submittedBy: 'author' }),
  ], { returnChanges: true }).run(connection))
  .then(compInsertResult => rethink.table('pipelines').insert([{
    id: 'test-pipeline-2',
    name: 'Test Pipeline 2',
    description: 'Test description',
    owningConsortium: 'test-cons-2',
    shared: true,
    steps: [
      {
        computations: [
          compInsertResult.changes[2].new_val.id,
        ],
        controller: {
          options: {},
          id: 'test-controller-1',
          type: 'local',
        },
        id: 'HJwMOMTh-',
        inputMap: {
          covariates: [
            {
              name: 'isControl',
              source: { inputKey: 'file', inputLabel: 'File', pipelineIndex: -1 },
              type: 'boolean',
            },
            {
              name: 'age',
              source: { inputKey: 'file', inputLabel: 'File', pipelineIndex: -1 },
              type: 'number',
            },
          ],
          freeSurferRegion: { value: ['3rd-Ventricle'] },
          lambda: { value: 4 },
        },
      },
      {
        computations: [
          compInsertResult.changes[3].new_val.id,
        ],
        controller: { type: 'decentralized' },
        id: 'HyLfdfanb',
        inputMap: {
          covariates: [
            {
              name: 'biased xs',
              source: { inputKey: 'biasedX', inputLabel: 'Computation 1: Biased Xs', pipelineIndex: 0 },
              type: 'number',
            },
          ],
          freeSurferRegion: { value: ['5th-Ventricle'] },
          iterationCount: { value: 3 },
          lambda: { value: 4 },
        },
      },
    ],
  },
  {
    id: 'test-pipeline-decentralized',
    name: 'Decentralized Pipeline',
    description: 'Test description',
    owningConsortium: 'test-cons-2',
    shared: true,
    steps: [
      {
        id: 'UIKDl-',
        controller: { type: 'decentralized' },
        computations: [
          compInsertResult.changes[1].new_val.id,
        ],
        inputMap: {
          start: { value: 1 },
        },
      },
    ],
  },
  {
    id: 'test-pipeline-local',
    name: 'Local Pipeline',
    description: 'Local Test description',
    owningConsortium: 'test-cons-2',
    shared: true,
    steps: [
      {
        id: 'UIKDl-local1',
        controller: { type: 'local' },
        computations: [
          compInsertResult.changes[0].new_val.id,
        ],
        inputMap: {
          start: { value: 1 },
        },
      },
      {
        id: 'UIKDl-local2',
        controller: { type: 'local' },
        computations: [
          compInsertResult.changes[0].new_val.id,
        ],
        inputMap: {
          start: { fromCache: { step: 0, variable: 'sum', label: 'Sum' } },
        },
      },
    ],
  },
  ]).run(connection))
  .then(() => rethink.tableCreate('roles', { primaryKey: 'role' }).run(connection))
  .then(() => rethink.table('roles').insert([
    { role: 'owner', verbs: { write: true, read: true } },
    { role: 'member', verbs: { subscribe: true } },
  ]).run(connection))
  .then(() => rethink.tableCreate('users').run(connection))
  .then(() => rethink.tableCreate('runs').run(connection))
  .then(() => rethink.table('runs').insert([
    {
      id: 'results-1',
      title: 'TSNE',
      pipelineId: 'test-pipeline',
      clients: ['test'],
      consortiumId: 'test-cons-2',
      date: '1/22/2018',
      type: 'decentralized',
      results: {
        type: 'scatter_plot',
        label: '',
        x_labels: ['-100', '80'],
        y_labels: ['-80', '80'],
        plots: [
          {
            title: '0',
            coordinates: [
              {
                x: 12.098,
                y: -72.356,
              },
              {
                x: 7.0038,
                y: -54.051,
              },
              {
                x: 8.7711,
                y: -57.018,
              },
              {
                x: -5.372,
                y: -82.911,
              },
              {
                x: -18.65,
                y: -94.955,
              },
              {
                x: -0.43827,
                y: -78.434,
              },
            ],
          },
          {
            title: '1',
            coordinates: [
              {
                x: 1.4987,
                y: -101.38,
              },
              {
                x: 0.96424,
                y: -102.25,
              },
              {
                x: -17.659,
                y: -95.997,
              },
              {
                x: -5.0453,
                y: -69.168,
              },
              {
                x: 12.593,
                y: -89.655,
              },
              {
                x: 8.6105,
                y: -91.641,
              },
            ],
          },
          {
            title: '2',
            coordinates: [
              {
                x: 48.988,
                y: -24.481,
              },
              {
                x: 30.156,
                y: -3.7403,
              },
              {
                x: 22.191,
                y: -12.257,
              },
              {
                x: 19.628,
                y: -13.65,
              },
              {
                x: 48.778,
                y: -21.647,
              },
              {
                x: 19.768,
                y: -11.083,
              },
            ],
          },
          {
            title: '9',
            coordinates: [
              {
                x: -58.108,
                y: -13.587,
              },
              {
                x: -47.321,
                y: 53.963,
              },
              {
                x: -56.119,
                y: -11.41,
              },
              {
                x: -51.595,
                y: 54.788,
              },
              {
                x: -60.736,
                y: 3.9981,
              },
              {
                x: -43.288,
                y: -5.1986,
              },
            ],
          },
        ],
      },
    },
    {
      id: 'results-2',
      title: 'MRI QC',
      pipelineId: 'test-pipeline',
      clients: ['test'],
      consortiumId: 'test-cons-2',
      date: '1/23/2018',
      type: 'decentralized',
      results: {
        type: 'box_plot',
        label: '',
        x: [
          {
            label: 'fwhm_x',
            values: [
              2.440704,
              2.4548064,
              2.3936447,
              2.5057568,
              2.4331584,
              2.4189439,
              2.391568,
              2.5149056,
            ],
          },
          {
            label: 'fwhm_y',
            values: [
              2.7808607,
              2.9629952,
              2.7132992,
              2.9282688,
              2.852704,
              2.93376,
              2.88102,
              2.8415712,
            ],
          },
          {
            label: 'fwhm_z',
            values: [
              2.2223925,
              2.254465,
              2.0552725,
              2.31188,
              2.1533875,
              2.1320375,
              2.189615,
              2.26769,
            ],
          },
        ],
        y_range: [2, 3.2],
      },
    },
  ]).run(connection))
  .then(() => rethink.tableCreate('consortia').run(connection))
  .then(() => rethink.table('consortia').insert({
    id: 'test-cons-1',
    name: 'Test Consortia 1',
    description: 'This consortia is for testing.',
    owners: ['test'],
    members: [],
  }).run(connection))
  .then(() => rethink.table('consortia').insert({
    id: 'test-cons-2',
    activePipelineId: 'test-pipeline-decentralized',
    name: 'Test Consortia 2',
    description: 'This consortia is for testing too.',
    owners: ['test'],
    members: [],
  }).run(connection))
  .then(() => connection.close());
})
.then(() => helperFunctions.hashPassword('password'))
.then(passwordHash => helperFunctions.createUser({
  id: 'test',
  username: 'test',
  institution: 'mrn',
  email: 'test@mrn.org',
  permissions: {
    computations: {},
    consortia: {
      'test-cons-1': ['member'],
      'test-cons-2': ['owner'],
    },
    pipelines: {},
  },
  consortiaStatuses: {
    'test-cons-1': 'none',
    'test-cons-2': 'none',
  },
}, passwordHash))
.then(() => helperFunctions.hashPassword('password'))
.then(passwordHash => helperFunctions.createUser({
  id: 'server',
  username: 'server',
  institution: 'mrn',
  email: 'server@mrn.org',
  permissions: {
    computations: {},
    consortia: {},
    pipelines: {},
  },
  consortiaStatuses: {
    'test-cons-1': 'none',
    'test-cons-2': 'none',
  },
}, passwordHash))
.then(() => helperFunctions.hashPassword('password'))
.then(passwordHash => helperFunctions.createUser({
  id: 'author',
  username: 'author',
  institution: 'mrn',
  email: 'server@mrn.org',
  permissions: {
    computations: {
      'single-shot-test-id': ['owner'],
      'multi-shot-test-id': ['owner'],
    },
    consortia: {
      'test-cons-1': ['owner'],
      'test-cons-2': ['member'],
    },
    pipelines: {},
  },
}, passwordHash))
.then(() => {
  process.exit();
})
.catch(console.log);  // eslint-disable-line no-console
