const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
let appSettings = {
  gamesDir: '',
};

const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

function ensureDirExists(dirPath) {
  if (!dirPath) return;
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create directory:', dirPath, err);
  }
}

function initSettings() {
  const downloads = app.getPath('downloads');
  appSettings.gamesDir = path.join(downloads, 'LabyrinthSavedGames');

  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      appSettings = { ...appSettings, ...JSON.parse(data) };
    } else {
      fs.writeFileSync(settingsFilePath, JSON.stringify(appSettings, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to load/save settings:', err);
  }
  ensureDirExists(appSettings.gamesDir);
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Labyrinth Game Solver',
    backgroundColor: '#0c0a09',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.setMenuBarVisibility(false);

  if (!app.isPackaged) {
    // Poll dev server — try port 3000, fall back to 3001
    waitForDevServer([3000, 3001], 15000).then((port) => {
      console.log(`[Electron] Vite dev server found on port ${port}`);
      mainWindow.loadURL(`http://localhost:${port}`);
    }).catch(() => {
      console.error('[Electron] Vite dev server not found after timeout');
      mainWindow.loadURL('http://localhost:3000');
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

/**
 * Poll a list of ports until one responds with HTTP 200.
 * Returns the first port that responds.
 */
function waitForDevServer(ports, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tryNext() {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('Timed out waiting for dev server'));
      }
      let remaining = ports.length;
      let found = false;
      ports.forEach((port) => {
        http.get(`http://localhost:${port}`, (_res) => {
          if (!found) {
            found = true;
            resolve(port);
          }
        }).on('error', () => {
          remaining--;
          if (remaining === 0 && !found) {
            setTimeout(tryNext, 200);
          }
        });
      });
    }
    tryNext();
  });
}

app.whenReady().then(() => {
  initSettings();
  createWindow();
 
  ipcMain.on('open-local-storage-folder', () => {
    const folderPath = path.join(app.getPath('userData'), 'Local Storage');
    shell.openPath(folderPath);
  });

  ipcMain.handle('settings:get', () => {
    return appSettings;
  });

  ipcMain.handle('settings:set', (event, newSettings) => {
    appSettings = { ...appSettings, ...newSettings };
    ensureDirExists(appSettings.gamesDir);
    try {
      fs.writeFileSync(settingsFilePath, JSON.stringify(appSettings, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
    return appSettings;
  });

  ipcMain.handle('settings:select-dir', async (event, title) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Select Directory',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('settings:open-dir', async (event, dirPath) => {
    shell.openPath(dirPath);
  });

  ipcMain.handle('games:list', async () => {
    ensureDirExists(appSettings.gamesDir);
    try {
      const files = fs.readdirSync(appSettings.gamesDir);
      const games = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(appSettings.gamesDir, file);
          try {
            const stats = fs.statSync(filePath);
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            if (data && (data.board || data.grid || data.spareTile)) {
              games.push({
                name: path.basename(file, '.json'),
                key: filePath,
                timestamp: stats.mtimeMs,
              });
            }
          } catch {
            // Ignore invalid json
          }
        }
      }
      return games.sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
      console.error('Failed to list games:', err);
      return [];
    }
  });

  ipcMain.handle('game:save', async (event, { name, content }) => {
    ensureDirExists(appSettings.gamesDir);
    const targetPath = path.join(appSettings.gamesDir, `${name}.json`);
    try {
      fs.writeFileSync(targetPath, JSON.stringify(content, null, 2), 'utf8');
      return { success: true, key: targetPath };
    } catch (err) {
      console.error('[game:save] failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('game:load', async (event, filePath) => {
    try {
      const contentRaw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(contentRaw);
    } catch (err) {
      console.error('[game:load] failed:', err);
      return null;
    }
  });

  ipcMain.handle('game:delete', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      console.error('[game:delete] failed:', err);
      return false;
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
