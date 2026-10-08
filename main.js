const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFile = () => path.join(app.getPath('userData'), 'donnees.json');
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#3f3f3f',
    title: 'Forex Pro Trader Tracker',
    icon: path.join(__dirname, 'build', 'icon.png'),

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.maximize();

  // =========================================================
  // DIAGNOSTIC ELECTRON
  // =========================================================

  const indexPath = path.join(__dirname, 'src', 'index.html');

  console.log('========================================');
  console.log('FOREX PRO TRADER TRACKER');
  console.log('========================================');
  console.log('Application path :', __dirname);
  console.log('Index path       :', indexPath);
  console.log('index.html       :', fs.existsSync(indexPath));
  console.log(
    'preload.js       :',
    fs.existsSync(path.join(__dirname, 'preload.js'))
  );
  console.log(
    'styles.css       :',
    fs.existsSync(path.join(__dirname, 'src', 'styles.css'))
  );
  console.log(
    'app.js           :',
    fs.existsSync(path.join(__dirname, 'src', 'app.js'))
  );
  console.log(
    'calc.js          :',
    fs.existsSync(path.join(__dirname, 'src', 'calc.js'))
  );
  console.log(
    'charts.js        :',
    fs.existsSync(path.join(__dirname, 'src', 'charts.js'))
  );
  console.log('========================================');

  // Erreur de chargement de la page
  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error('ERREUR DE CHARGEMENT');
      console.error('Code :', errorCode);
      console.error('Description :', errorDescription);
      console.error('URL :', validatedURL);

      dialog.showErrorBox(
        'Erreur de chargement',
        `Impossible de charger l'application.\n\n` +
        `Code : ${errorCode}\n` +
        `Description : ${errorDescription}\n\n` +
        `URL : ${validatedURL}`
      );
    }
  );

  // Erreurs JavaScript provenant de l'interface
  win.webContents.on(
    'console-message',
    (_event, level, message, line, sourceId) => {
      console.log(
        `[Renderer] niveau=${level} | ${message} | ligne=${line} | source=${sourceId}`
      );
    }
  );

  // Crash du processus renderer
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('RENDERER ARRÊTÉ');
    console.error(details);

    dialog.showErrorBox(
      'Erreur de l’application',
      `Le moteur de l'interface s'est arrêté.\n\n` +
      `Raison : ${details.reason}\n` +
      `Code : ${details.exitCode}`
    );
  });

  // Page complètement chargée
  win.webContents.on('did-finish-load', () => {
    console.log('========================================');
    console.log('INDEX.HTML CHARGÉ AVEC SUCCÈS');
    console.log('========================================');
  });

  // DOM prêt
  win.webContents.on('dom-ready', () => {
    console.log('DOM READY');
  });

  // =========================================================
  // CHARGEMENT DE L'APPLICATION
  // =========================================================

  win.loadFile(indexPath);

  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Exporter une sauvegarde…',
          accelerator: 'CmdOrCtrl+E',
          click: exportData
        },
        {
          label: 'Importer une sauvegarde…',
          accelerator: 'CmdOrCtrl+I',
          click: importData
        },
        {
          type: 'separator'
        },
        {
          role: 'quit',
          label: 'Quitter'
        }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        {
          role: 'zoomIn',
          label: 'Zoom avant'
        },
        {
          role: 'zoomOut',
          label: 'Zoom arrière'
        },
        {
          role: 'resetZoom',
          label: 'Zoom normal'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen',
          label: 'Plein écran'
        }
      ]
    }
  ];

  Menu.setApplicationMenu(
    Menu.buildFromTemplate(template)
  );
}

async function exportData() {
  if (!win) return;

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exporter une sauvegarde',
    defaultPath: 'sauvegarde-track-record.json',
    filters: [
      {
        name: 'Sauvegarde JSON',
        extensions: ['json']
      }
    ]
  });

  if (canceled || !filePath) return;

  try {
    const content = fs.existsSync(dataFile())
      ? fs.readFileSync(dataFile(), 'utf8')
      : '{}';

    fs.writeFileSync(
      filePath,
      content,
      'utf8'
    );
  } catch (e) {
    dialog.showErrorBox(
      'Export impossible',
      String(e.message || e)
    );
  }
}

async function importData() {
  if (!win) return;

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Importer une sauvegarde',
    properties: ['openFile'],
    filters: [
      {
        name: 'Sauvegarde JSON',
        extensions: ['json']
      }
    ]
  });

  if (canceled || !filePaths.length) return;

  try {
    const parsed = JSON.parse(
      fs.readFileSync(
        filePaths[0],
        'utf8'
      )
    );

    win.webContents.send(
      'data:imported',
      parsed
    );
  } catch (e) {
    dialog.showErrorBox(
      'Import impossible',
      'Ce fichier n\'est pas une sauvegarde valide.'
    );
  }
}

ipcMain.handle('data:load', () => {
  try {
    if (fs.existsSync(dataFile())) {
      return JSON.parse(
        fs.readFileSync(
          dataFile(),
          'utf8'
        )
      );
    }
  } catch (e) {
    console.error(
      'Erreur lecture données :',
      e
    );
  }

  return null;
});

ipcMain.handle('data:save', (_evt, data) => {
  try {
    const tmp = dataFile() + '.tmp';

    fs.mkdirSync(
      path.dirname(dataFile()),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      tmp,
      JSON.stringify(data),
      'utf8'
    );

    fs.renameSync(
      tmp,
      dataFile()
    );

    return true;
  } catch (e) {
    console.error(
      'Erreur sauvegarde :',
      e
    );

    return false;
  }
});

const gotLock =
  app.requestSingleInstanceLock();

if (!gotLock) {

  app.quit();

} else {

  app.on(
    'second-instance',
    () => {

      if (win) {

        if (win.isMinimized()) {
          win.restore();
        }

        win.focus();
      }
    }
  );

  app.whenReady()
    .then(createWindow);

  app.on(
    'window-all-closed',
    () => app.quit()
  );
}
