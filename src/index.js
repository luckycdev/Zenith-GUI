const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess = null;
let serverExePath = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'img', 'zenith-round.png'),
    autoHideMenuBar: true,
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    contextIsolation: true,
  });

  // and load the index.html of the app.
  mainWindow.loadFile('src/index.html');
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle('select-server', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Executable', extensions: ['exe'] }],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    serverExePath = result.filePaths[0];
    return serverExePath;
  }

  return null;
});

ipcMain.handle('start-server', (_event, args) => {
  if (!serverExePath || serverProcess) return;

  const {
    serverName,
    maxPlayers,
    port,
    privateMode,
    steamAuth,
  } = args;

  if (!serverName || !maxPlayers || port <= 1000) {
    return 'invalid';
  }

  const flags = [
    '--hostname', `"${serverName}"`,
    '--maxplayers', maxPlayers,
    '--port', port,
    '--nosteam',
  ];

  if (privateMode) flags.push('--private');
  if (steamAuth) {
    const i = flags.indexOf('--nosteam');
    if (i !== -1) flags.splice(i, 1);
  }

  serverProcess = spawn(serverExePath, flags, {
    cwd: path.dirname(serverExePath),
    shell: true,
  });

  serverProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('console-output', data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('console-output', `[stderr] ${data.toString()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    serverProcess = null;
  });

  return 'started'; // TODO crashing
});

ipcMain.handle('stop-server', () => {
  if (serverProcess && serverProcess.stdin.writable) {
    serverProcess.stdin.write('exit\n'); // TODO broken?
  }
});