const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

let mainWindow = null;

// O'yinlar yuklanadigan papka: AppData/maroqli-launcher/games
const getGamesDir = () => {
  const dir = path.join(app.getPath('userData'), 'games');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'MAROQLI.uz',
    autoHideMenuBar: true,
    backgroundColor: '#050506',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('https://maroqli.uz');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('check-installed', async (event, { slug, execPath }) => {
  if (!slug || !execPath) return false;
  const gameFolder = path.join(getGamesDir(), slug);
  const fullExecPath = path.join(gameFolder, execPath);
  return fs.existsSync(fullExecPath);
});

ipcMain.handle('launch-game', async (event, { slug, execPath }) => {
  if (!slug || !execPath) return { success: false, error: 'Missing parameters' };
  const gameFolder = path.join(getGamesDir(), slug);
  const fullExecPath = path.join(gameFolder, execPath);

  if (!fs.existsSync(fullExecPath)) {
    return { success: false, error: 'Executable not found' };
  }

  // Windows-da o'yinni ishga tushirish (child process)
  const isWindows = process.platform === 'win32';
  const command = isWindows ? `"${fullExecPath}"` : `./"${execPath}"`;
  
  exec(command, { cwd: gameFolder }, (err) => {
    if (err) {
      console.error('Failed to launch game:', err);
    }
  });

  return { success: true };
});

ipcMain.handle('download-game', async (event, { slug, downloadUrl, execPath }) => {
  if (!slug || !downloadUrl) return { success: false, error: 'Missing slug or downloadUrl' };
  
  const destDir = path.join(getGamesDir(), slug);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const zipPath = path.join(destDir, 'game_archive.zip');
  const fileStream = fs.createWriteStream(zipPath);

  return new Promise((resolve) => {
    // URL agar relative bo'lsa (sayt ichidan bo'lsa) asosiy sayt URL'ini biriktiramiz
    const finalUrl = downloadUrl.startsWith('http') 
      ? downloadUrl 
      : `https://maroqli.uz${downloadUrl}`;

    https.get(finalUrl, (response) => {
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && mainWindow) {
          const progress = Math.round((downloadedBytes / totalBytes) * 100);
          mainWindow.webContents.send('download-progress', { slug, progress });
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        
        // Windowsda arxivdan chiqarish (PowerShell orqali - dependencies kerak emas)
        const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
        
        exec(cmd, (err) => {
          // Yuklab olingan zip faylni o'chiramiz
          try { fs.unlinkSync(zipPath); } catch (e) {}

          if (err) {
            console.error('Extraction error:', err);
            resolve({ success: false, error: 'Arxivdan chiqarishda xatolik' });
          } else {
            resolve({ success: true });
          }
        });
      });
    }).on('error', (err) => {
      console.error('Download error:', err);
      resolve({ success: false, error: 'Yuklab olishda xatolik' });
    });
  });
});

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
