const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

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

  // To'g'ridan-to'g'ri internetdagi asosiy saytni yuklaydi
  mainWindow.loadURL('https://maroqli.uz');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
