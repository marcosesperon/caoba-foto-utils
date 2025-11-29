const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

    onProgress: (callback) => ipcRenderer.on('conversion:progress', (_event, data) => callback(data)),

    selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
    selectFile: () => ipcRenderer.invoke('dialog:select-file'),
    saveFile: () => ipcRenderer.invoke('dialog:save-file'),
    
    scanAndSortFiles: (folder, sortMode) => ipcRenderer.invoke('util:scan-and-sort', folder, sortMode),
    
    slideshowGenerate: (data) => ipcRenderer.invoke('action:slide-generate', data),
    
    cancelGeneration: () => ipcRenderer.invoke('action:cancel'),

    resizerGenerate: (folder, dimension, saveMode) => ipcRenderer.invoke('action:resizer-generate', folder, dimension, saveMode)
});

