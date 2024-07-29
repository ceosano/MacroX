const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  screen,
  globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");
const robot = require("@jitsi/robotjs");

let mainWindow;
let tray = null; // Tray icon
let overlay; // Overlay window
let overlayTimeout; // Timeout for overlay visibility
let recordedActions = []; // Initialize an empty array to store recorded actions

let isRecording = false; // State to track recording status

const { GlobalKeyboardListener } = require("node-global-key-listener");
const keyboardListener = new GlobalKeyboardListener();
const keyHandler = (event) => {
  mainWindow.webContents.send("key-pressed", event);
};

function switchHooking(flag) {
  if (flag) keyboardListener.addListener(keyHandler);
  else keyboardListener.removeListener(keyHandler);
}

// Set up IPC listener
ipcMain.handle("call-switch-function", async (event, data) => {
  switchHooking(data);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      backgroundThrottling: false, // Disable background throttling
    },
  });
  mainWindow.loadFile("index.html");

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      // Ensure overlay and recording state are maintained when main window is hidden
      if (isRecording) {
        showOverlay("Recording continues...");
      }
    }
  });

  mainWindow.on("show", () => {
    mainWindow.webContents.send("refresh-ui");
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "icon.png");
  if (!fs.existsSync(iconPath)) {
    return; // Exit the function if icon is not found
  }
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Open", click: () => mainWindow.show() },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("MacroX");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    mainWindow.show();
  });
}

app.on("ready", () => {
  createWindow();
  createTray();
  if (!overlay) {
    createOverlay();
  }
  // Ensure global shortcuts are always registered
  const ret = globalShortcut.register("Ctrl+R", () => {
    console.log("Ctrl+R pressed");
    // click the toggle recording button
    mainWindow.webContents.executeJavaScript(
      'document.getElementById("toggle-record-button").click();'
    );
  });
  if (!ret) {
    console.error("Registration of global shortcut failed");
  } else {
    console.log("Registration of global shortcut succeeded");
  }
  // // Additional global shortcut for playing back actions
  // const playRet = globalShortcut.register("Ctrl+P", () => {
  //   console.log("Ctrl+P pressed", recordedActions.length);
  //   if (recordedActions.length > 0) {
  //     mainWindow.webContents.executeJavaScript(
  //       'document.getElementById("play-button").click();'
  //     );
  //     showOverlay("Playing back actions...");
  //   }
  // });
  // if (!playRet) {
  //   console.error("Registration of playback shortcut failed");
  // }
  ipcMain.on("register-shortcut", (event, bindKey) => {
    const shortcut = `Ctrl+${bindKey}`;
    console.log("short cut==>", shortcut);
    const playRet = globalShortcut.register(shortcut, () => {
      console.log(`Ctrl+${bindKey} pressed!`, recordedActions.length);
      if (recordedActions.length > 0) {
        mainWindow.webContents.executeJavaScript(
          'document.getElementById("play-button").click();'
        );
        showOverlay("Playing back actions...");
      }
    });
    if (!playRet) {
      console.error("Registration of playback shortcut failed");
    }
  });
});

app.on("window-all-closed", (event) => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.disableHardwareAcceleration();

async function checkKeysSequence(recordedActions) {
  for (let i = 0; i < recordedActions.length - 1; i++) {
    if (
      (recordedActions[i].key.includes("ctrl") &&
        recordedActions[i + 1].key === "R") ||
      (recordedActions[i].key === "R" &&
        recordedActions[i + 1].key.toLowerCase().includes("ctrl"))
    ) {
      recordedActions.splice(i, 2);
    }
  }
}

async function pushActionAsync(action) {
  return new Promise((resolve) => {
    recordedActions.push(action);
    resolve();
  });
}

ipcMain.on("record-action", async (event, action) => {
  await pushActionAsync(action);
  await checkKeysSequence(recordedActions);
  if (!mainWindow) {
    console.error("mainWindow is not initialized.");
    return;
  }
  if (mainWindow.webContents.isLoading()) {
    await new Promise((resolve) => {
      mainWindow.webContents.once("did-finish-load", resolve);
    });
  }

  mainWindow.webContents.send("update-actions", recordedActions);

  showOverlay(`Recorded: ${action.key}`); // Display overlay with action type
});

ipcMain.on("delete-action", (event, actionId) => {
  let temp = recordedActions.filter((action) => action.id != actionId);
  recordedActions = temp;
  if (!mainWindow) {
    console.error("mainWindow is not initialized.");
    return;
  }
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.send("update-actions", recordedActions);
    });
  } else {
    mainWindow.webContents.send("update-actions", recordedActions);
  }
});

ipcMain.handle("get-recorded-actions", async (event) => {
  const actions = recordedActions;
  return actions;
});

ipcMain.on("play-actions", () => {
  recordedActions.forEach((action, index) => {
    setTimeout(() => {
      try {
        if (action.type === "mouse") {
          if (typeof action.x === "number" && typeof action.y === "number") {
            console.log(
              `Executing mouse action at (${action.button}, ${action.state})`
            ); // Debugging
            robot.moveMouse(action.x, action.y);
            if (action.button != undefined && action.state != undefined) {
              robot.mouseToggle(action.state, action.button);
            }
          } else {
            throw new Error("Invalid mouse action coordinates or parameters");
          }
        } else if (action.type === "keyboard") {
          if (typeof action.key === "string") {
            // Removed console.log and replaced with showOverlay
            showOverlay(`Playing: ${action.key}`);
            if (action.key.toLowerCase().includes("ctrl")) {
              robot.keyToggle("control", "down");
              robot.keyToggle("control", "up");
            } else if (action.state.includes("up")) {
              robot.keyTap(action.key);
            }
          } else {
            throw new Error("Invalid keyboard action key");
          }
        }
        // Show overlay with action details
        showOverlay(`Playing: ${action.key} `);
      } catch (error) {
        showOverlay(`Error executing action: ${error.message}`); // Display errors on overlay
      }
    }, (action.delay || 0) + index * 100); // Adding a base delay to ensure actions are not all executed at once
  });
});

ipcMain.on("save-actions", (event, actions) => {});

function createOverlay() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  overlay = new BrowserWindow({
    width: 300,
    height: 100,
    x: width - 310,
    y: 10,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    focusable: false,
    skipTaskbar: true,
    opacity: 0,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
    backgroundColor: "#000000", // Ensure background is fully transparent
  });

  overlay.setIgnoreMouseEvents(true);
  overlay.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
        <body style="margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: rgba(0, 0, 0, 0.5);">
            <div id="content" style="font-family: Arial; color: white; text-align: center; padding: 15px; height: 100%; display: flex; align-items: center; justify-content: center;">
                Content will appear here
            </div>
        </body>
        </html>
    `)}`
  );
  overlay.on("closed", () => {
    overlay = null; // Cleanup overlay when closed
    createOverlay(); // Recreate overlay if it gets closed
  });
}

function showOverlay(content) {
  const displayContent =
    content.split("\n").join(" ").substring(0, 50) +
    (content.length > 50 ? "..." : "");

  if (overlayTimeout) {
    clearTimeout(overlayTimeout);
  }

  if (!overlay) {
    createOverlay();
  }

  // Ensure the overlay is ready and then send the content
  if (overlay.webContents.isLoading()) {
    overlay.webContents.once("did-finish-load", () => {
      overlay.webContents.executeJavaScript(
        `document.getElementById('content').innerText = '${displayContent.replace(
          /'/g,
          "\\'"
        )}';`
      );
    });
  } else {
    overlay.webContents.executeJavaScript(
      `document.getElementById('content').innerText = '${displayContent.replace(
        /'/g,
        "\\'"
      )}';`
    );
  }

  overlay.setOpacity(1); // Make the overlay visible

  overlayTimeout = setTimeout(() => {
    if (overlay) overlay.setOpacity(0); // Make the overlay transparent again after 3 seconds
  }, 3000);
}

app.on("will-quit", () => {
  // Unregister all shortcuts when the application is quitting
  globalShortcut.unregisterAll();
});
