'use strict';

const clientFactory = require('../utils/client-factory');
const coinstacCommon = require('coinstac-common');
const EventEmitter = require('events');
const fs = require('fs');
const fileStats = require('../../src/utils/file-stats');
const noop = require('lodash/noop');
const path = require('path');
const projectFactory = require('../utils/project-factory');
const ProjectService = require('../../src/sub-api/project-service');
const sinon = require('sinon');
const test = require('tape');

function getNextTick(callback) {
  return new Promise((resolve, reject) => {
    process.nextTick(() => {
      try {
        callback();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

test('ProjectService - getMetaFileContents', t => {
  const badFile1 = path.resolve(__dirname, '..', 'mocks', 'bad-dummy-1.csv');
  const badFile2 = path.resolve(__dirname, '..', 'mocks', 'bad-dummy-2.csv');
  const createReadStreamSpy = sinon.spy(fs, 'createReadStream');
  const goodFile = path.resolve(__dirname, '..', 'mocks', 'good-dummy.csv');

  t.plan(4);

  ProjectService.prototype.getMetaFileContents(badFile1)
    .then(() => t.fail('resolves with header-less CSV'))
    .catch(error => {
      t.ok(
        createReadStreamSpy.calledWith(badFile1),
        'creates read stream with file arg'
      );
      t.ok(
        error.message.toLowerCase().indexOf('is control'),
        'rejects without \'is control\' header'
      );

      return ProjectService.prototype.getMetaFileContents(badFile2);
    })
    .then(() => t.fail('resolves with malformed CSV'))
    .catch(() => {
      t.pass('rejects with malformed CSV');

      return ProjectService.prototype.getMetaFileContents(goodFile);
    })
    .then(output => {
      t.deepEqual(
        output,
        [
          ['M100', true],
          ['M101', true],
          ['M102', false],
          ['M103', false],
          ['M104', false],
        ],
        'returns is controls'
      );
    })
    .catch(t.end)
    .then(() => {
      // teardown
      createReadStreamSpy.restore();
    });
});

// TODO: This test fails when this file is tested independently. Why?
test('ProjectService - addFiles/removeFiles', (t) => {
  const p1 = projectFactory();
  let c1;

  t.plan(6);

  clientFactory()
  .then(client => {
    c1 = client;
    return c1.projects.save(p1);
  })
  .then((doc) => Object.assign(p1, doc)) // update p1 w/ latest attrs, e.g. _rev
  .then(() => t.equals(p1.files.length, 0, 'files empty on first persist'))
  // pretend to add some files
  .then(() => c1.projects.addFiles(p1, []))
  .then((files) => t.equals(files.length, 0, 'no files added'))
  // add some files
  .then(() => c1.projects.addFiles(p1, __filename))
  .then((files) => {
    t.equals(files.length, 1, 'files added');
    Object.assign(p1.files, files);
  })
  // attempt to add the same file again
  .then(() => c1.projects.addFiles(p1, __filename))
  .then((files) => {
    t.equals(files.length, 1, 'file add request ignored on duplicate filename');
  })
  // remove files
  .then(() => c1.projects.removeFiles(p1, __filename))
  .then((files) => t.equals(files.length, 0, 'file removed'))
  .then(() => c1.teardown())
  .then(() => t.pass('teardown'))
  .then(t.end, t.end);
});

test('ProjectSerice - gets stats', t => {
  const param1 = [0, 1, 2];
  const param2 = 'wat';
  const prepareStub = sinon.stub(fileStats, 'prepare');

  prepareStub.returns(Promise.resolve('bananas'));


  t.plan(3);

  ProjectService.prototype.getFileStats(param1)
    .then(response => {
      t.equal(prepareStub.lastCall.args[0], param1, 'passes array param');
      t.equal(response, 'bananas', 'passes fileStats#prepare response');

      return ProjectService.prototype.getFileStats(param2);
    })
    .then(() => {
      t.deepEqual(
        prepareStub.lastCall.args[0],
        [param2],
        'changes single items to array'
      );
    })
    .catch(t.end)
    .then(prepareStub.restore);
});

test('ProjectService - database listeners', t => {
  const addListenerSpy = sinon.spy();
  const dbAllStub = sinon.stub();
  const dbListenerStub = sinon.stub(
    coinstacCommon.helpers,
    'DBListener'
  );
  const destroyListenerSpy = sinon.spy();
  const projects = [{
    _id: 'wat',
    consortiumId: 'pokeman',
  }, {
    _id: 'doge',
    consortiumId: null,
  }];
  const projectsDb = {
    all: dbAllStub,
    name: 'pikachu',
  };

  function dbRegistryGetStub(dbName) {
    if (dbName === 'projects') {
      return projectsDb;
    }

    return {
      name: dbName,
    };
  }

  dbListenerStub.returns({
    destroy: destroyListenerSpy,
    on: addListenerSpy,
  });
  dbAllStub.returns(Promise.resolve(projects));

  const projectService = new ProjectService({
    client: {},
    dbRegistry: {
      get: dbRegistryGetStub,
    },
  });

  t.plan(7);

  projectService.initializeListeners()
    .then(() => t.fail('Resolves without callback'))
    .catch(() => {
      t.pass('Rejects without callback');

      return projectService.initializeListeners(noop);
    })
    .then(() => {
      t.equal(
        dbListenerStub.firstCall.args[0],
        projectsDb,
        'creates projects db listener'
      );

      t.ok(
        projectService.listeners.has(ProjectService.PROJECTS_LISTENER),
        'adds projects db listener'
      );

      // wires up all current projects with consortium IDs
      t.ok(
        dbListenerStub.calledWith(dbRegistryGetStub(
          `remote-consortium-${projects[0].consortiumId}`
        )),
        'adds listener to projects database'
      );

      // adds referenches to .listeners and .projects
      t.equal(
        projectService.projects.get(projects[0]._id),
        projects[0].consortiumId,
        'adds project with consortium ID'
      );
      t.ok(
        projectService.listeners.has(projects[0].consortiumId),
        'adds consortium ID to listeners'
      );
      t.ok(
        (
          !projectService.projects.has(projects[1]._id) &&
          projectService.listeners.size === 2
        ),
        'Doesn’t add project without consortium ID'
      );
    })
    .catch(t.end)
    .then(() => {
      // teardown
      dbListenerStub.restore();
    });
});

test('ProjectService - database listener events', t => {
  const callbackSpy = sinon.spy();
  const consortium2ChangeDoc = {};
  const consortiumEmitter1 = new EventEmitter();
  const consortiumEmitter2 = new EventEmitter();
  const projectEmitter = new EventEmitter();
  const projects = [{
    _id: 'spongebob',
    consortiumId: 'squarepants',
  }, {
    _id: 'mister',
    consortiumId: 'crabs',
  }];

  const dbListenerStub = sinon.stub(
    coinstacCommon.helpers,
    'DBListener',
    ({ name }) => {
      if (name === 'projects') {
        return projectEmitter;
      } else if (name.indexOf(projects[0].consortiumId) > -1) {
        return consortiumEmitter1;
      } else if (name.indexOf(projects[1].consortiumId) > -1) {
        return consortiumEmitter2;
      }

      throw new Error(`DB name ${name} lacks mock listener`);
    }
  );

  t.plan(6);

  const projectService = new ProjectService({
    client: {},
    dbRegistry: {
      get: dbName => {
        const db = {
          name: dbName,
          get: id => {
            if (dbName === 'projects') {
              return Promise.resolve(projects.find(p => p._id === id));
            }

            return Promise.resolve();
          },
        };

        if (dbName === 'projects') {
          db.all = () => Promise.resolve(projects.slice(0, 1));
        }

        return db;
      },
    },
  });

  projectService.initializeListeners(callbackSpy)
    .then(() => {
      // adds projects db change/delete listeners
      const doc1 = {};
      const doc2 = {};

      t.notOk(callbackSpy.callCount, 'doesn’t call callback initially');

      // Ensure that project changes are reflected in internal stores
      projectEmitter.emit('change', {
        name: 'projects',
        doc: projects[0],
      });
      consortiumEmitter1.emit('change', {
        name: `remote-consortium-${projects[0]._id}`,
        doc: doc1,
      });
      consortiumEmitter1.emit('delete', {
        name: `remote-consortium-${projects[0]._id}`,
        doc: doc2,
      });

      return getNextTick(() => {
        const firstCallArgs = callbackSpy.firstCall.args[1];
        const secondCallArgs = callbackSpy.secondCall.args[1];

        t.ok(
          // Has projects listener and first consortium listnener:
          (
            projectService.listeners.size === 2 &&
            Array.from(projectService.listeners.keys()).indexOf(
              projects[0].consortiumId
            ) > -1 &&
            projectService.projects.size === 1
          ),
          'doesn’t alter internal store'
        );

        t.equal(callbackSpy.callCount, 2, 'only fires callback once per event');

        t.ok(
          firstCallArgs.consortiumId === projects[0].consortiumId &&
          firstCallArgs.doc === doc1 &&
          firstCallArgs.projectId === projects[0]._id,
          'fires callback upon change'
        );

        t.ok(
          secondCallArgs.consortiumId === projects[0].consortiumId &&
          secondCallArgs.doc === doc2 &&
          secondCallArgs.projectId === projects[0]._id,
          'fires callback upon delete'
        );
      });
    })
    .then(() => {
      // Simulate a 'new' project
      projectEmitter.emit('change', {
        doc: projects[1],
        name: 'projects',
      });

      /**
       * Fire on `nextTick` to prevent race conditions with the project's
       * `change` event.
       *
       * @todo Do something about he race conditions
       */
      return getNextTick(() => {
        // Simulate a remote doc change
        consortiumEmitter2.emit('change', {
          doc: consortium2ChangeDoc,
          name: `remote-consortium-${projects[1].consortiumId}`,
        });
      });
    })
    .then(() => {
      t.ok(
        (
          projectService.listeners.size === 3 &&
          Array.from(projectService.listeners.keys()).indexOf(
            projects[1].consortiumId
          ) > -1 &&
          callbackSpy.thirdCall.args[1].doc === consortium2ChangeDoc
        ),
        'adds project’s consortium db listener'
      );
    })
    .catch(t.end)
    .then(() => {
      // teardown
      dbListenerStub.restore();
    });
});
