const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openLocalStorageFolder: () => ipcRenderer.send('open-local-storage-folder'),
});
