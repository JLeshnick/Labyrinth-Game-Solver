const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');

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
  createWindow();
 
  ipcMain.on('open-local-storage-folder', () => {
    const folderPath = path.join(app.getPath('userData'), 'Local Storage');
    shell.openPath(folderPath);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
