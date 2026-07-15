const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  downloadGame: (slug, downloadUrl, execPath) => 
    ipcRenderer.invoke('download-game', { slug, downloadUrl, execPath }),
  
  launchGame: (slug, execPath) => 
    ipcRenderer.invoke('launch-game', { slug, execPath }),
  
  checkInstalled: (slug, execPath) => 
    ipcRenderer.invoke('check-installed', { slug, execPath }),

  onDownloadProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  }
});
