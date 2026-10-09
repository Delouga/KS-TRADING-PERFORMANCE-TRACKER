const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  setLang: (lang) => ipcRenderer.send('lang:set', lang),
  onImported: (cb) => ipcRenderer.on('data:imported', (_e, data) => cb(data))
});
