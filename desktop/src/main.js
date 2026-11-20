import { app, BrowserWindow, net, protocol, session } from 'electron';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Desktop shell: serves the static web game from `ascii-racing://app/` so it
 * boots offline from the files shipped in the package. No CDN and no network.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(here, '..', 'www');
const SCHEME = 'ascii-racing';
const HOST = 'app';
const ORIGIN = `${SCHEME}://${HOST}`;
const smoke = process.argv.includes('--smoke');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// The page unlocks audio on a key press. This keeps the context from staying
// suspended when the window has no browser autoplay gesture yet.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setName('ascii-racing');

/**
 * Map an `ascii-racing://app/` request onto a file inside the game directory.
 * Returns null for any other host, a missing file, or a path that escapes the directory.
 */
function resolveGameFile(requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${SCHEME}:` || url.hostname !== HOST) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (pathname === '' || pathname === '/') pathname = '/index.html';

  const relative = pathname.replace(/^\/+/, '');
  if (relative.includes('\0')) return null;

  const root = path.resolve(GAME_DIR);
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  if (!existsSync(resolved) || !statSync(resolved).isFile()) return null;
  return resolved;
}

/** Requests the page is allowed to make. Anything else, including the web counter, is refused. */
function allowShellRequest(requestUrl) {
  if (
    requestUrl.startsWith(`${SCHEME}:`) ||
    requestUrl.startsWith('blob:') ||
    requestUrl.startsWith('data:') ||
    requestUrl.startsWith('devtools:')
  ) {
    return true;
  }
  if (!requestUrl.startsWith('file:')) return false;
  let file;
  try {
    file = fileURLToPath(requestUrl);
  } catch {
    return false;
  }
  const root = path.resolve(GAME_DIR);
  const resolved = path.resolve(file);
  return resolved === root || resolved.startsWith(root + path.sep);
}

async function serve(req) {
  const file = resolveGameFile(req.url);
  if (!file) return new Response('Not found', { status: 404 });
  const res = await net.fetch(pathToFileURL(file).href);
  if (!res.ok) return new Response('Not found', { status: 404 });
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self'",
    },
  });
}

function createWindow() {
  const iconPath = path.resolve(here, '..', 'build', 'icon.png');
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#07080c',
    title: 'ASCII Racing',
    show: !smoke,
    autoHideMenuBar: true,
    icon: existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${ORIGIN}/`)) event.preventDefault();
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  void win.loadURL(`${ORIGIN}/index.html`);
  return win;
}

/** `--smoke`: open the game hidden, check the title screen booted, print the result and exit. */
async function runSmoke(win) {
  const deadline = Date.now() + 60_000;
  let result = null;
  while (Date.now() < deadline) {
    result = await win.webContents
      .executeJavaScript(
        `(() => {
          const c = document.getElementById('c');
          // resize() sizes the canvas to the window. The default canvas is 300x150,
          // so a larger bitmap means the game script finished booting.
          return {
            ready: !!(c && c.width > 320 && c.height > 200 && location.protocol === 'ascii-racing:'),
            href: location.href,
            canvas: c ? [c.width, c.height] : null,
            viewport: [window.innerWidth, window.innerHeight]
          };
        })()`,
      )
      .catch(() => null);
    if (result?.ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const ok = result?.ready === true;
  console.log(`SMOKE ${JSON.stringify(result)}`);
  app.exit(ok ? 0 : 1);
}

const gotLock = smoke ? true : app.requestSingleInstanceLock();
if (!gotLock) {
  app.exit(0);
} else {
  let win = null;

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, serve);
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      callback({ cancel: !allowShellRequest(details.url) });
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false);
    });

    if (!existsSync(path.join(GAME_DIR, 'index.html'))) {
      console.error(`Game files were not found at ${GAME_DIR}. Run npm run build first.`);
      app.exit(1);
      return;
    }

    win = createWindow();
    if (smoke) void runSmoke(win);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
