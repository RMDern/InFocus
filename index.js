const electron = require('electron');
const path = require('path');
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

const { app, BrowserWindow, Menu } = electron;
let mainWindow;
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

app.on('ready', () => {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: true
    }
  });
  mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.maximize();
  mainWindow.setFullScreen(true);

  mainWindow.on('resize', () => {
    mainWindow.reload();
  });

  const menu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(menu);
});

const mainMenuTemplate = [
  {
    label: 'Devtool',
    accelerator: 'D',
    click() {
      mainWindow.webContents.openDevTools();
    }
  },
  {
    label: 'Reload',
    accelerator: 'R',
    click() {
      mainWindow.reload();
    }
  },
  {
    label: 'Exit',
    accelerator: 'X',
    click() {
      app.exit();
    }
  }
];