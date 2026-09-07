import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/*
 * Production-safe startup fixes for the existing citizen portal.
 * No database, users, wallet balances, routes or application logic are changed.
 *
 * 1) The frontend already contains the AP location master as frontend/locations.csv,
 *    while /api/locations currently looks for andhra_pradesh_villages.csv.
 *    Copy the existing master to that expected runtime path when missing.
 *
 * 2) Chromium on Render may not have a Telugu font installed. Self-host Noto Serif
 *    Telugu from Fontsource and inject its real self-contained @font-face CSS into
 *    the existing HTML PDF templates. This avoids any external Google-font request.
 */

async function ensureLocationMaster() {
  const source = path.join(ROOT, 'frontend', 'locations.csv');
  const target = path.join(ROOT, 'andhra_pradesh_villages.csv');

  if (fsSync.existsSync(target)) return;
  if (!fsSync.existsSync(source)) {
    console.warn('[PRODUCTION FIX] frontend/locations.csv not found; location API fallback skipped.');
    return;
  }

  await fs.copyFile(source, target);
  console.log('[PRODUCTION FIX] AP location master prepared:', target);
}

async function buildTeluguFontCss() {
  const packageDir = path.join(
    __dirname,
    'node_modules',
    '@fontsource',
    'noto-serif-telugu'
  );
  const cssPath = path.join(packageDir, '400.css');

  if (!fsSync.existsSync(cssPath)) {
    console.warn('[PRODUCTION FIX] Noto Serif Telugu 400.css not found.');
    return null;
  }

  let css = await fs.readFile(cssPath, 'utf8');
  const matches = [...css.matchAll(/url\(([^)]+)\)/g)];

  for (const match of matches) {
    const raw = String(match[1] || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw || /^data:/i.test(raw)) continue;

    const fontPath = path.resolve(path.dirname(cssPath), raw);
    if (!fsSync.existsSync(fontPath)) continue;

    const ext = path.extname(fontPath).toLowerCase();
    const mime = ext === '.woff2' ? 'font/woff2' : ext === '.woff' ? 'font/woff' : 'application/octet-stream';
    const data = (await fs.readFile(fontPath)).toString('base64');
    css = css.replace(match[0], `url(data:${mime};base64,${data})`);
  }

  return css;
}

async function injectTeluguFontIntoTemplates() {
  const fontCss = await buildTeluguFontCss();
  if (!fontCss) return;

  const templatesDir = path.join(ROOT, 'backend', 'templates');
  if (!fsSync.existsSync(templatesDir)) return;

  const names = (await fs.readdir(templatesDir)).filter(name => name.toLowerCase().endsWith('.html'));
  let patched = 0;

  for (const name of names) {
    const filePath = path.join(templatesDir, name);
    let html = await fs.readFile(filePath, 'utf8');
    if (html.includes('id="koutilya-telugu-font"')) continue;

    const fontStyle = `<style id="koutilya-telugu-font">${fontCss}</style>`;
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${fontStyle}</head>`);
    } else {
      html = `${fontStyle}${html}`;
    }

    await fs.writeFile(filePath, html, 'utf8');
    patched += 1;
  }

  console.log(`[PRODUCTION FIX] Telugu font embedded into ${patched} existing HTML PDF template(s).`);
}

try {
  await ensureLocationMaster();
  await injectTeluguFontIntoTemplates();
} catch (error) {
  console.error('[PRODUCTION FIX] Startup preparation failed:', error?.message || error);
}
