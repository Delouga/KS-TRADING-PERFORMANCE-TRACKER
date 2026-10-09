const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFile = () => path.join(app.getPath('userData'), 'donnees.json');

// Langue du menu et des boîtes de dialogue (changée depuis l'interface via le sélecteur FR / EN)
let LANG = 'fr';
const TR = {
  fr: {
    menuFile: 'Fichier', exportItem: 'Exporter une sauvegarde…', importItem: 'Importer une sauvegarde…', quit: 'Quitter',
    menuView: 'Affichage', zoomIn: 'Zoom avant', zoomOut: 'Zoom arrière', zoomReset: 'Zoom normal', fullscreen: 'Plein écran',
    exportTitle: 'Exporter une sauvegarde', exportFile: 'sauvegarde-track-record.json', importTitle: 'Importer une sauvegarde',
    filter: 'Sauvegarde JSON', exportFail: 'Export impossible', importFail: 'Import impossible',
    importInvalid: "Ce fichier n'est pas une sauvegarde valide."
  },
  en: {
    menuFile: 'File', exportItem: 'Export a backup…', importItem: 'Import a backup…', quit: 'Quit',
    menuView: 'View', zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomReset: 'Actual size', fullscreen: 'Full screen',
    exportTitle: 'Export a backup', exportFile: 'track-record-backup.json', importTitle: 'Import a backup',
    filter: 'JSON backup', exportFail: 'Export failed', importFail: 'Import failed',
    importInvalid: 'This file is not a valid backup.'
  }
};
const tr = (k) => TR[LANG][k];

// Dossier de données au nouveau nom du logiciel. Les données de l'ancien dossier
// ("Forex Pro Trader Tracker") sont reprises automatiquement au premier lancement (l'ancien dossier n'est pas touché).
(function reprendreDonnees() {
  const base = app.getPath('appData');
  const nouveauDir = path.join(base, 'KS TRADING PERFORMANCE TRACKER');
  app.setPath('userData', nouveauDir);
  let ancienDir = null;
  try {
    if (fs.existsSync(path.join(nouveauDir, 'donnees.json'))) return;
    ancienDir = ['Forex Pro Trader Tracker', 'forex-pro-trader-tracker']
      .map((n) => path.join(base, n))
      .find((d) => fs.existsSync(path.join(d, 'donnees.json'))) || null;
    if (!ancienDir) return;
    fs.mkdirSync(nouveauDir, { recursive: true });
    fs.readdirSync(ancienDir).forEach((f) => {
      if (/^donnees.*\.json$/.test(f)) fs.copyFileSync(path.join(ancienDir, f), path.join(nouveauDir, f));
    });
  } catch (e) {
    // En cas de problème, on continue avec l'ancien dossier pour ne rien perdre
    if (ancienDir) app.setPath('userData', ancienDir);
  }
})();
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#3f3f3f',
    title: 'KS TRADING PERFORMANCE TRACKER',
    icon: path.join(__dirname, 'icon.png'),

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.maximize();

  // =========================================================
  // CHEMIN DE L'APPLICATION
  // =========================================================

  const indexPath = path.join(__dirname, 'index.html');

  console.log('========================================');
  console.log('KS TRADING PERFORMANCE TRACKER');
  console.log('========================================');
  console.log('Application path :', __dirname);
  console.log('Index path       :', indexPath);

  console.log(
    'index.html       :',
    fs.existsSync(path.join(__dirname, 'index.html'))
  );

  console.log(
    'preload.js       :',
    fs.existsSync(path.join(__dirname, 'preload.js'))
  );

  console.log(
    'styles.css       :',
    fs.existsSync(path.join(__dirname, 'styles.css'))
  );

  console.log(
    'app.js           :',
    fs.existsSync(path.join(__dirname, 'app.js'))
  );

  console.log(
    'calc.js          :',
    fs.existsSync(path.join(__dirname, 'calc.js'))
  );

  console.log(
    'charts.js        :',
    fs.existsSync(path.join(__dirname, 'charts.js'))
  );

  console.log(
    'logo.png         :',
    fs.existsSync(path.join(__dirname, 'logo.png'))
  );

  console.log(
    'icon.png         :',
    fs.existsSync(path.join(__dirname, 'icon.png'))
  );

  console.log(
    'icon.ico         :',
    fs.existsSync(path.join(__dirname, 'icon.ico'))
  );

  console.log('========================================');

  // =========================================================
  // ERREUR DE CHARGEMENT
  // =========================================================

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

  // =========================================================
  // ERREURS JAVASCRIPT
  // =========================================================

  win.webContents.on(
    'console-message',
    (_event, level, message, line, sourceId) => {

      console.log(
        `[Renderer] niveau=${level} | ${message} | ligne=${line} | source=${sourceId}`
      );
    }
  );

  // =========================================================
  // CRASH DU RENDERER
  // =========================================================

  win.webContents.on(
    'render-process-gone',
    (_event, details) => {

      console.error('RENDERER ARRÊTÉ');
      console.error(details);

      dialog.showErrorBox(
        'Erreur de l’application',
        `Le moteur de l'interface s'est arrêté.\n\n` +
        `Raison : ${details.reason}\n` +
        `Code : ${details.exitCode}`
      );
    }
  );

  // =========================================================
  // PAGE CHARGÉE
  // =========================================================

  win.webContents.on(
    'did-finish-load',
    () => {

      console.log('========================================');
      console.log('INDEX.HTML CHARGÉ AVEC SUCCÈS');
      console.log('========================================');
    }
  );

  // =========================================================
  // DOM PRÊT
  // =========================================================

  win.webContents.on(
    'dom-ready',
    () => {

      console.log('DOM READY');
    }
  );

  // =========================================================
  // CHARGEMENT DE L'APPLICATION
  // =========================================================

  win.loadFile(indexPath);

  buildMenu();
}

// =========================================================
// MENU
// =========================================================

function buildMenu() {

  const template = [

    {
      label: tr('menuFile'),

      submenu: [

        {
          label: tr('exportItem'),
          accelerator: 'CmdOrCtrl+E',
          click: exportData
        },

        {
          label: tr('importItem'),
          accelerator: 'CmdOrCtrl+I',
          click: importData
        },

        {
          type: 'separator'
        },

        {
          role: 'quit',
          label: tr('quit')
        }

      ]
    },

    {
      label: tr('menuView'),

      submenu: [

        {
          role: 'zoomIn',
          label: tr('zoomIn')
        },

        {
          role: 'zoomOut',
          label: tr('zoomOut')
        },

        {
          role: 'resetZoom',
          label: tr('zoomReset')
        },

        {
          type: 'separator'
        },

        {
          role: 'togglefullscreen',
          label: tr('fullscreen')
        }

      ]
    }

  ];

  Menu.setApplicationMenu(
    Menu.buildFromTemplate(template)
  );
}

// =========================================================
// EXPORT
// =========================================================

async function exportData() {

  if (!win) return;

  const {
    canceled,
    filePath
  } = await dialog.showSaveDialog(win, {

    title: tr('exportTitle'),

    defaultPath: tr('exportFile'),

    filters: [
      {
        name: tr('filter'),
        extensions: ['json']
      }
    ]

  });

  if (canceled || !filePath) return;

  try {

    const content =
      fs.existsSync(dataFile())
        ? fs.readFileSync(dataFile(), 'utf8')
        : '{}';

    fs.writeFileSync(
      filePath,
      content,
      'utf8'
    );

  } catch (e) {

    dialog.showErrorBox(
      tr('exportFail'),
      String(e.message || e)
    );
  }
}

// =========================================================
// IMPORT
// =========================================================

async function importData() {

  if (!win) return;

  const {
    canceled,
    filePaths
  } = await dialog.showOpenDialog(win, {

    title: tr('importTitle'),

    properties: ['openFile'],

    filters: [
      {
        name: tr('filter'),
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
      tr('importFail'),
      tr('importInvalid')
    );
  }
}

// =========================================================
// CHARGEMENT DES DONNÉES
// =========================================================

ipcMain.handle(
  'data:load',
  () => {

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
  }
);

// =========================================================
// SAUVEGARDE DES DONNÉES
// =========================================================

ipcMain.on('lang:set', (_evt, l) => {
  LANG = l === 'en' ? 'en' : 'fr';
  buildMenu();
});

ipcMain.handle(
  'data:save',
  (_evt, data) => {

    try {

      const tmp =
        dataFile() + '.tmp';

      fs.mkdirSync(
        path.dirname(dataFile()),
        {
          recursive: true
        }
      );

      // Copie de sécurité unique de l'ancien fichier (1 seule année) avant sa conversion multi-années
      try {
        if (fs.existsSync(dataFile())) {
          const ancien = fs.readFileSync(dataFile(), 'utf8');
          const copie = path.join(path.dirname(dataFile()), 'donnees-avant-multi-annees.json');
          if (!ancien.includes('"years"') && !fs.existsSync(copie)) fs.writeFileSync(copie, ancien, 'utf8');
        }
      } catch (e) { /* sans gravité */ }

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
  }
);

// =========================================================
// INSTANCE UNIQUE
// =========================================================

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
