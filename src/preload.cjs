const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openLocalStorageFolder: () => ipcRenderer.send('open-local-storage-folder'),
 
  // Game files management
  listGames: () => ipcRenderer.invoke('games:list'),
  saveGame: (name, content) => ipcRenderer.invoke('game:save', { name, content }),
  loadGame: (key) => ipcRenderer.invoke('game:load', key),
  deleteGame: (key) => ipcRenderer.invoke('game:delete', key),
 
  // Settings & Custom directory
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  selectDirectory: (title) => ipcRenderer.invoke('settings:select-dir', title),
  openDirectory: (dirPath) => ipcRenderer.invoke('settings:open-dir', dirPath),
});
