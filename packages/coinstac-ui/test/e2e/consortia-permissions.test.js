const { Application } = require('spectron');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path = require('path');

const electronPath = path.join(__dirname, '../..', 'node_modules', '.bin', 'electron');
const appPath = path.join(__dirname, '../..');
const mocksPath = path.join(__dirname, 'mocks.js');

const EXIST_TIMEOUT = 4000;
const NOTIFICATION_DISMISS_TIMEOUT = 6000;
const COMPUTATION_TIMEOUT = 120000;
const COMPUTATION_DOWNLOAD_TIMEOUT = 30000;
const USER_ID_1 = 'test1';
const USER_ID_2 = 'test2';
const PASS = 'password';
const CONS_NAME = 'e2e-consortium';
const CONS_DESC = 'e2e-description';
const PIPE_NAME = 'e2e-pipeline';
const PIPE_DESC = 'e2e-pipeline-description';
const COMPUTATION_NAME = 'single shot regression demo';

chai.should();
chai.use(chaiAsPromised);

const app1 = new Application({
  path: electronPath,
  env: { NODE_ENV: 'test', TEST_INSTANCE: 'test-1' },
  args: [appPath, '-r', mocksPath],
});

const app2 = new Application({
  path: electronPath,
  env: { NODE_ENV: 'test', TEST_INSTANCE: 'test-2' },
  args: [appPath, '-r', mocksPath],
});

describe('e2e consortia permissions', () => {
  before(() => (
    Promise.all([
      app1.start(),
      app2.start(),
    ])
  ));

  after(() => (
    Promise.all([
      app1.stop(),
      app2.browserWindow.close(),
    ])
  ));

  it('opens a single window on first instance', () => (
    app1.client.waitUntilWindowLoaded()
      .getWindowCount().should.eventually.equal(1)
  ));

  it('opens a single window on second instance', () => (
    app2.client.waitUntilWindowLoaded()
      .getWindowCount().should.eventually.equal(1)
  ));

  it('displays the correct title', () => (
    app1.client.waitUntilWindowLoaded()
      .getTitle().should.eventually.equal('COINSTAC')
  ));

  it('authenticates demo user on first instance', () => (
    app1.client
      .waitForVisible('#login-username', EXIST_TIMEOUT)
      .setValue('#login-username', USER_ID_1)
      .setValue('#login-password', PASS)
      .click('button=Log In')
      .waitForExist('.user-account-name', EXIST_TIMEOUT)
      .getText('.user-account-name').should.eventually.equal(USER_ID_1)
  ));

  it('authenticates demo user on second instance', () => (
    app2.client
      .waitForVisible('#login-username', EXIST_TIMEOUT)
      .setValue('#login-username', USER_ID_2)
      .setValue('#login-password', PASS)
      .click('button=Log In')
      .waitForExist('.user-account-name', EXIST_TIMEOUT)
      .getText('.user-account-name').should.eventually.equal(USER_ID_2)
  ));

  it('accesses the Add Consortium page', () => (
    app1.client
      .click('a=Consortia')
      .waitForVisible('a=Create Consortium', EXIST_TIMEOUT)
      .click('a=Create Consortium')
      .isVisible('h1=Consortium Creation').should.eventually.equal(true)
  ));

  it('creates a consortium', () => (
    app1.client
      .setValue('#name', CONS_NAME)
      .setValue('#description', CONS_DESC)
      .click('button=Save')
      .waitForText('.notification-message', EXIST_TIMEOUT)
      .getText('.notification-message')
      .then(notificationMessage => notificationMessage.should.equal('Consortium Saved'))
      .then(() => app1.client
        .waitForVisible('.notification-message', NOTIFICATION_DISMISS_TIMEOUT, true)
        .click('a=Consortia')
        .waitForVisible(`h3=${CONS_NAME}`))
  ));

  it('add another user as member', () => (
    app1.client
      .click('a=Consortia')
      .waitForVisible(`a[name="${CONS_NAME}"]`, EXIST_TIMEOUT)
      .click(`a[name="${CONS_NAME}"]`)
      .waitForVisible('h1=Consortium Edit', EXIST_TIMEOUT)
      .click('.rbt-input-main')
      .waitForVisible('.rbt-menu', EXIST_TIMEOUT)
      .element('.rbt-menu', EXIST_TIMEOUT)
      .click(`span=${USER_ID_2}`)
      .click('button=Add Member')
      .waitForVisible(`span=${USER_ID_2}`, EXIST_TIMEOUT)
  ));

  it('access consortium as member', () => (
    app2.client
      .click('a=Consortia')
      .waitForVisible(`a[name="${CONS_NAME}"]`, EXIST_TIMEOUT)
      .click(`a[name="${CONS_NAME}"]`)
      .waitForVisible('h1=Consortium Edit', EXIST_TIMEOUT)
      .waitForVisible(`span=${USER_ID_2}`, EXIST_TIMEOUT)
      .element('#consortium-tabs-pane-1 tbody tr:last-child')
      .isSelected('input[name="isOwner"]').should.eventually.equal(false)
  ));

  it('grant ownership to a member', () => (
    app1.client
      .click('a=Consortia')
      .waitForVisible(`a[name="${CONS_NAME}"]`, EXIST_TIMEOUT)
      .click(`a[name="${CONS_NAME}"]`)
      .waitForVisible('h1=Consortium Edit', EXIST_TIMEOUT)
      .waitForVisible(`span=${USER_ID_2}`, EXIST_TIMEOUT)
      .element('#consortium-tabs-pane-1 tbody tr:last-child')
      .click('input[name="isOwner"]')
  ));

  it('access consortium as owner', () => (
    app2.client
      .click('a=Consortia')
      .waitForVisible(`a[name="${CONS_NAME}"]`, EXIST_TIMEOUT)
      .click(`a[name="${CONS_NAME}"]`)
      .waitForVisible('h1=Consortium Edit', EXIST_TIMEOUT)
      .waitForVisible(`span=${USER_ID_2}`, EXIST_TIMEOUT)
      .element('#consortium-tabs-pane-1 tbody tr:last-child')
      .isSelected('input[name="isOwner"]').should.eventually.equal(true)
  ));

  it('deletes consortium', () => (
    app1.client
      .click('a=Consortia')
      .waitForVisible(`button[name="${CONS_NAME}-delete"]`, EXIST_TIMEOUT)
      .click(`button[name="${CONS_NAME}-delete"]`)
      .element('.modal-dialog')
      .click('button=Delete')
      .waitForVisible(`h3=${CONS_NAME}`, EXIST_TIMEOUT, true)
  ));

  it('logs out', () => (
    Promise.all([
      app1.client
        .waitForVisible('button=Log Out', EXIST_TIMEOUT)
        .click('button=Log Out')
        .waitForVisible('button=Log In', EXIST_TIMEOUT),
      app2.client
        .waitForVisible('button=Log Out', EXIST_TIMEOUT)
        .click('button=Log Out')
        .waitForVisible('button=Log In', EXIST_TIMEOUT),
    ])
  ));
});
