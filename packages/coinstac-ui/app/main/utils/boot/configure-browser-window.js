/**
* Configure Electron's `BrowserWindow` -- the user interface.
*
* {@link http://electron.atom.io/docs/tutorial/quick-start/}
*/

'use strict';

const electron = require('electron');
const electronDefaultMenu = require('electron-default-menu');
const path = require('path');
const url = require('url');

const {
  app: electronApp,
  BrowserWindow,
} = electron;
let mainWindow = null;
let splashWindow = null;

/**
 * Create a `BrowserWindow`
 */
function createWindow() {
  const renderIndexPath = require.resolve('app/render/index.html');
  const renderSplashPath = require.resolve('app/render/splash.html');
  const menu = electronDefaultMenu(electron.app, electron.shell);
  const size = electron.screen.getPrimaryDisplay().workAreaSize;

  const isTest = process.env.NODE_ENV === 'test';

  /**
   * Create the browser window, set to fill user's screen. Keep a global
   * reference of the window object, if you don't, the window will be closed
   * automatically when the javascript object is GCed.
   */

  if (!isTest) {
    splashWindow = new BrowserWindow({
      width: 810,
      height: 610,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
      },
    });

    splashWindow.loadURL(`file://${renderSplashPath}`);
  }

  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${renderIndexPath}`);

  mainWindow.once('ready-to-show', () => {
    if (!isTest) {
      setTimeout(() => {
        splashWindow.destroy();
        splashWindow = null;
      }, 4000);
    }

    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // Set app's menu
  menu[0].submenu.splice(1, 0,
    {
      type: 'separator',
    },
    {
      label: 'Logs',
      click() {
        let logWindow = new BrowserWindow({
          height: 600,
          width: 800,
          webPreferences: {
            nodeIntegration: true,
          },
        });

        logWindow.loadURL(url.format({
          pathname: path.join(__dirname, '../../../render/log.html'),
          protocol: 'file:',
          slashes: true,
          webPreferences: {
            devTools: false,
          },
        }));
        // `webPreferences.devTools = false` doesn't work?!
        logWindow.webContents.closeDevTools();

        logWindow.once('close', () => {
          logWindow = null;
        });
      },
    });
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(menu));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electronApp.on('ready', createWindow);

// Quit when all windows are closed.
electronApp.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    electronApp.quit();
  }
});

electronApp.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

module.exports = function getWindow() { return mainWindow; };
