const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { exec } = require('child_process');

// Protocol client ro'yxatdan o'tkazish: maroqli://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('maroqli', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('maroqli');
}

let mainWindow = null;

// Protocol handler for Windows
function handleArgv(argv) {
  const prefix = 'maroqli://';
  const arg = argv.find(a => a.startsWith(prefix));
  if (arg && mainWindow) {
    const urlPath = arg.replace(prefix, '');
    mainWindow.loadURL(`https://maroqli.uz/${urlPath}`);
  }
}

// Bitta instance bo'lishini ta'minlash
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      handleArgv(commandLine);
    }
  });
}

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

  // Start URL ni aniqlash (deep link orqali ochilgan bo'lsa)
  let startUrl = 'https://maroqli.uz';
  const prefix = 'maroqli://';
  const arg = process.argv.find(a => a.startsWith(prefix));
  if (arg) {
    const urlPath = arg.replace(prefix, '');
    startUrl = `https://maroqli.uz/${urlPath}`;
  }

  mainWindow.loadURL(startUrl);

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

  const isTarGz = downloadUrl.toLowerCase().endsWith('.tar.gz') || downloadUrl.toLowerCase().endsWith('.tgz');
  const archiveName = isTarGz ? 'game_archive.tar.gz' : 'game_archive.zip';
  const zipPath = path.join(destDir, archiveName);
  const fileStream = fs.createWriteStream(zipPath);

  return new Promise((resolve) => {
    // URL agar relative bo'lsa (sayt ichidan bo'lsa) asosiy sayt URL'ini biriktiramiz
    const finalUrl = downloadUrl.startsWith('http') 
      ? downloadUrl 
      : `https://maroqli.uz${downloadUrl}`;

    function downloadFile(targetUrl) {
      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, (response) => {
        // HTTP/HTTPS redirectlarini tekshirish va kuzatish (GitHub releases -> AWS S3 uchun muhim)
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          downloadFile(response.headers.location);
          return;
        }

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
          
          // Windowsda arxivdan chiqarish (.tar.gz uchun tar.exe, .zip uchun powershell)
          const cmd = isTarGz 
            ? `tar -xf "${zipPath}" -C "${destDir}"`
            : `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
          
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
    }

    downloadFile(finalUrl);
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
