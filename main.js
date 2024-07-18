const { app, BrowserWindow, ipcMain } = require('electron/main');
// const robot = require('robotjs');
const robot = require("@jitsi/robotjs");
const path = require('path');

let mainWindow;
let recordedActions = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    // fullscreen: true,
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.disableHardwareAcceleration();

ipcMain.on('record-action', (event, action) => {
  recordedActions.push(action);
  if (!mainWindow) {
    console.error('mainWindow is not initialized.');
    return;
  }
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('update-actions', recordedActions);
    });
  } else {
    mainWindow.webContents.send('update-actions', recordedActions);
  }
});

ipcMain.on('delete-action', (event, actionId) => {
  let temp = recordedActions.filter((action) => action.id != actionId);
  recordedActions = temp;
  if (!mainWindow) {
    console.error('mainWindow is not initialized.');
    return;
  }
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('update-actions', recordedActions);
    });
  } else {
    mainWindow.webContents.send('update-actions', recordedActions);
  }
});

ipcMain.handle('get-recorded-actions', async (event) => {
  const actions = recordedActions;
  return actions;
});

ipcMain.on('play-actions', () => {
  recordedActions.forEach((action, index) => {
    console.log('Playing recorded actions...', index);
    setTimeout(() => {
      try {
        if (action.type === 'mouse') {
          if (typeof action.x === 'number' && typeof action.y === 'number') {
            console.log(`Executing mouse action at (${action.button}, ${action.state})`); // Debugging
            try {
              robot.moveMouse(action.x, action.y);
            } catch (error) {
              console.error('Error executing moveMouse:', error);
              return; // Stop execution to prevent further errors
            }
            try {
              robot.mouseToggle(action.button, action.state);
            } catch (error) {
              console.error('Error executing mouseToggle:', error);
            }
          } else {
            throw new Error('Invalid mouse action coordinates or parameters');
          }
        } else if (action.type === 'keyboard') {
          if (typeof action.key === 'string') {
            console.log(`Executing keyboard action for key: ${action.key}`); // Debugging
            robot.keyTap(action.key);
          } else {ß
            throw new Error('Invalid keyboard action key');
          }
        }
      } catch (error) {
        console.error('Error executing action:', error);
      }
    }, (action.delay || 0) + index * 100); // Adding a base delay to ensure actions are not all executed at once
  });
});

ipcMain.on('save-actions', (event, actions) => {
});