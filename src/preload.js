const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serverAPI', {
  selectServer: () => ipcRenderer.invoke('select-server'),
  start: (args) => ipcRenderer.invoke('start-server', args),
  stop: () => ipcRenderer.invoke('stop-server'),
});

contextBridge.exposeInMainWorld('consoleAPI', {
  onConsoleOutput: (callback) => {
    ipcRenderer.on('console-output', (_event, message) => callback(message));
  }
});