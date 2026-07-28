const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('asanPos', Object.freeze({
  openSetupFolder: () => ipcRenderer.invoke('asanpos:open-setup-folder'),
}));
