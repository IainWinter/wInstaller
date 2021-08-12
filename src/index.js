const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');

// ???? Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

function p(x) {
  return path.join(__dirname, x);
}

let window;

app.on('ready', () => 
{
  window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: p('preload.js')
    }
  });

  window.loadFile(p('index.html'));

  window.webContents.openDevTools();
});

ipcMain.on('toMain', (event, args) => 
{
  const { exec } = require("child_process")
  
  exec("dir", (error, stdout, stderr) => 
  {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }

    window.webContents.send('fromMain', stdout);
  });
});