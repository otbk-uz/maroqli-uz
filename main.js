const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let nextProcess = null;
let mainWindow = null;

function startNextServer() {
  return new Promise((resolve) => {
    const isPackaged = app.isPackaged;
    
    if (!isPackaged) {
      // In development, assume Next.js dev server is already running
      resolve();
      return;
    }

    // Path to next.js binary
    let nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    nextBin = nextBin.replace('app.asar', 'app.asar.unpacked');
    
    // Start Next.js production server in background on port 3000
    nextProcess = spawn('node', [nextBin, 'start', '-p', '3000'], {
      cwd: __dirname.replace('app.asar', 'app.asar.unpacked'),
      env: { ...process.env, NODE_ENV: 'production' },
      shell: true
    });

    // Poll to check when server is up
    const pollInterval = setInterval(() => {
      http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          clearInterval(pollInterval);
          resolve();
        }
      }).on('error', () => {
        // waiting for server
      });
    }, 500);

    // Timeout after 20 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      resolve();
    }, 20000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'MAROQLI.uz',
    autoHideMenuBar: true,
    backgroundColor: '#050506',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  await startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    try {
      nextProcess.kill();
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (nextProcess) {
    try {
      nextProcess.kill();
    } catch (e) {}
  }
});
