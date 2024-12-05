import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
let mainWindow = null;
let settingsWindow = null;

// CSS to inject
const customCSS = `
#alertBar {
    display: none !important;
}
`;

// Get the correct path for the extension based on whether we're in development or production
function getExtensionPath() {
    if (app.isPackaged) {
        // In production, the extension is in the resources directory
        return path.join(process.resourcesPath, 'chrome-extension');
    } else {
        // In development, the extension is in the dist directory
        return path.join(__dirname, '..', 'dist', 'chrome');
    }
}

// Load the Chrome extension
async function loadExtension() {
    try {
        const extensionPath = getExtensionPath();
        console.log('Loading extension from:', extensionPath);
        
        await session.defaultSession.loadExtension(extensionPath, {
            allowFileAccess: true
        });
        console.log('Extension loaded successfully!');
    } catch (err) {
        console.error('Failed to load extension:', err);
    }
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // Performance optimizations
            backgroundThrottling: false,
            enableWebSQL: false,
            webgl: false,
            offscreen: false
        },
        // Performance optimizations
        show: false, // Don't show until ready
        backgroundColor: '#ffffff'
    });

    const seqtaUrl = store.get('seqtaUrl');
    
    // Optimize page loading
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Open external links in browser instead of new electron window
        if (url.startsWith('http')) {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Inject CSS when the page loads
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.insertCSS(customCSS).catch(err => {
            console.error('Failed to inject CSS:', err);
        });
    });

    // Only show window when it's ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    if (seqtaUrl) {
        mainWindow.loadURL(seqtaUrl, {
            // Performance optimizations for page loading
            httpReferrer: seqtaUrl,
            userAgent: 'Chrome',
            cache: 'force-cache'
        }).then(() => {
            // Re-inject CSS after URL change
            mainWindow.webContents.insertCSS(customCSS).catch(err => {
                console.error('Failed to inject CSS after URL change:', err);
            });
        });
    } else {
        createSettingsWindow();
    }

    // Optimize memory usage
    mainWindow.on('minimize', () => {
        if (process.platform === 'darwin') return; // Skip for macOS
        mainWindow.webContents.setBackgroundThrottling(true);
    });

    mainWindow.on('restore', () => {
        mainWindow.webContents.setBackgroundThrottling(false);
    });

    // Only enable DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // Performance optimizations
            backgroundThrottling: false,
            enableWebSQL: false,
            webgl: false
        },
        show: false,
        backgroundColor: '#ffffff'
    });

    const settingsPath = path.join(__dirname, 'index.html');
    settingsWindow.loadFile(settingsPath);

    settingsWindow.once('ready-to-show', () => {
        settingsWindow.show();
        settingsWindow.focus();
    });

    // Only enable DevTools in development
    if (process.env.NODE_ENV === 'development') {
        settingsWindow.webContents.openDevTools();
    }

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// Performance optimization: Disable hardware acceleration if running on low-end device
if (process.platform !== 'darwin') { // Skip for macOS
    app.disableHardwareAcceleration();
}

// Performance optimization: Disable smooth scrolling
app.commandLine.appendSwitch('disable-smooth-scrolling');

// Wait for app to be ready before creating windows
app.whenReady().then(async () => {
    await loadExtension();
    createMainWindow();
});

// Performance optimization: Quit immediately instead of gracefully
app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// Handle setting the SEQTA URL
ipcMain.on('set-seqta-url', (event, url) => {
    console.log('Setting SEQTA URL:', url);
    store.set('seqtaUrl', url);
    if (mainWindow) {
        mainWindow.loadURL(url, {
            httpReferrer: url,
            userAgent: 'Chrome',
            cache: 'force-cache'
        }).then(() => {
            // Re-inject CSS after URL change
            mainWindow.webContents.insertCSS(customCSS).catch(err => {
                console.error('Failed to inject CSS after URL change:', err);
            });
        });
    } else {
        createMainWindow();
    }
    if (settingsWindow) {
        settingsWindow.close();
    }
}); 