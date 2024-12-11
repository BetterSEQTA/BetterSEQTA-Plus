import { app, BrowserWindow, ipcMain, session, Menu } from 'electron';
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

/* Match SEQTA's styling */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
}
`;

// Create the application menu
function createAppMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'Settings',
            submenu: [
                {
                    label: 'Configure SEQTA URL',
                    accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
                    click: () => {
                        createSettingsWindow();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Validate SEQTA URL
function isValidSeqtaUrl(url) {
    try {
        const urlObj = new URL(url);
        // Only ensure it's a valid HTTPS URL
        return urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

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
    console.log('🚀 Creating main window...');
    if (mainWindow) {
        if (!mainWindow.isDestroyed()) {
            console.log('✨ Existing window found, focusing it');
            mainWindow.focus();
            return mainWindow;
        }
        console.log('🔄 Old window was destroyed, creating new one');
    }

    console.log('📦 Initializing new BrowserWindow');
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            enableWebSQL: false,
            webgl: false,
            offscreen: false
        },
        show: false,
        backgroundColor: '#ffffff'
    });

    const seqtaUrl = store.get('seqtaUrl');
    console.log('📍 Stored SEQTA URL:', seqtaUrl);

    // Register keyboard shortcut for settings
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if ((input.meta || input.control) && input.key === ',') {
            createSettingsWindow();
        }
    });

    // Inject CSS when the page loads
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('🎨 Page loaded, injecting CSS');
        mainWindow.webContents.insertCSS(customCSS).catch(err => {
            console.error('Failed to inject CSS:', err);
        });
    });

    // Only show window when it's ready
    mainWindow.once('ready-to-show', () => {
        console.log('🎉 Window ready to show!');
        mainWindow.show();
        mainWindow.focus();
    });

    if (seqtaUrl) {
        if (!isValidSeqtaUrl(seqtaUrl)) {
            console.error('❌ Invalid SEQTA URL stored:', seqtaUrl);
            createSettingsWindow();
            return;
        }

        console.log('🌐 Loading SEQTA URL:', seqtaUrl);
        mainWindow.loadURL(seqtaUrl)
            .then(() => {
                console.log('✅ Successfully loaded SEQTA URL');
                mainWindow.show();
                mainWindow.focus();
            })
            .catch(err => {
                console.error('❌ Failed to load SEQTA URL:', err);
                createSettingsWindow();
            });
    } else {
        console.log('⚙️ No SEQTA URL found, opening settings');
        createSettingsWindow();
    }

    return mainWindow;
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
    createAppMenu();
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

// Format and validate SEQTA URL
function formatAndValidateUrl(url) {
    // Remove any whitespace
    url = url.trim();

    // If no protocol specified, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    // If it's http://, upgrade to https://
    if (url.startsWith('http://')) {
        url = 'https://' + url.slice(7);
    }

    try {
        const urlObj = new URL(url);
        // Ensure it's https
        if (urlObj.protocol !== 'https:') {
            throw new Error('URL must use HTTPS');
        }
        return { isValid: true, url: url };
    } catch (error) {
        return { isValid: false, url: url, error: error.message };
    }
}

// Handle setting the SEQTA URL
ipcMain.on('set-seqta-url', (event, url) => {
    console.log('🔧 Received new SEQTA URL:', url);
    
    const { isValid, url: formattedUrl, error } = formatAndValidateUrl(url);
    
    if (!isValid) {
        console.error('❌ Invalid URL format:', error);
        event.reply('seqta-url-error', 'Please enter a valid URL');
        return;
    }

    console.log('💾 Saving URL to store:', formattedUrl);
    store.set('seqtaUrl', formattedUrl);

    // Create main window if it doesn't exist
    if (!mainWindow || mainWindow.isDestroyed()) {
        console.log('🆕 Creating new main window');
        createMainWindow();
    } else {
        console.log('🔄 Loading new URL in existing window:', formattedUrl);
        mainWindow.loadURL(formattedUrl).then(() => {
            console.log('✅ URL loaded successfully');
            
            console.log('🎨 Injecting CSS and settings button');
            mainWindow.webContents.insertCSS(customCSS).catch(err => {
                console.error('Failed to inject CSS:', err);
            });
            
            mainWindow.webContents.executeJavaScript(`
                if (!document.getElementById('bsp-settings-button')) {
                    document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(settingsButtonHTML)});
                    document.getElementById('bsp-settings-button').addEventListener('click', () => {
                        window.postMessage('open-settings', '*');
                    });
                }
            `).catch(err => {
                console.error('Failed to inject settings button:', err);
            });

            console.log('👀 Showing and focusing window');
            mainWindow.show();
            mainWindow.focus();
        }).catch(err => {
            console.error('❌ Failed to load SEQTA URL:', err);
            event.reply('seqta-url-error', 'Failed to load SEQTA. Please check your connection and URL.');
        });
    }

    // Close settings window if it exists
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        console.log('🚪 Closing settings window');
        settingsWindow.close();
    }
}); 