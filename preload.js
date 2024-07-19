const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  recordAction: (action) => ipcRenderer.send('record-action', action),
  playActions: () => ipcRenderer.send('play-actions'),
  saveActions: (actions) => ipcRenderer.send('save-actions', actions),
  onUpdateActions: (callback) => ipcRenderer.on('update-actions', callback),
  deleteAction: (actionId) => ipcRenderer.send('delete-action', actionId),
  callSwitchFunction: async (flag) => {
    const result = await ipcRenderer.invoke('call-switch-function', flag);
    return result;
  },
});