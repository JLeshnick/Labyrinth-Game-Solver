const { contextBridge } = require('electron');

// Expose minimal API if needed, otherwise this is a placeholder
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
