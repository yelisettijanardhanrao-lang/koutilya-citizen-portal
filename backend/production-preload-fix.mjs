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
 *    Telugu from the npm package and inject it into existing HTML PDF templates.
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

async function findTeluguFont() {
  const fontDir = path.join(
    __dirname,
    'node_modules',
    '@fontsource',
    'noto-serif-telugu',
    'files'
  );

  if (!fsSync.existsSync(fontDir)) {
    console.warn('[PRODUCTION FIX] Noto Serif Telugu package is not installed yet.');
    return null;
  }

  const names = await fs.readdir(fontDir);
  const preferred = names.find(
    name => /telugu/i.test(name) && /400-normal\.woff2$/i.test(name)
  );
  const fallback = names.find(name => /\.woff2$/i.test(name));
  return preferred ? path.join(fontDir, preferred) : (fallback ? path.join(fontDir, fallback) : null);
}

async function injectTeluguFontIntoTemplates() {
  const fontPath = await findTeluguFont();
  if (!fontPath) return;

  const fontBase64 = (await fs.readFile(fontPath)).toString('base64');
  const fontCss = `<style id="koutilya-telugu-font">@font-face{font-family:"Noto Serif Telugu";src:url(data:font/woff2;base64,${fontBase64}) format("woff2");font-style:normal;font-weight:100 900;font-display:block;}</style>`;
  const templatesDir = path.join(ROOT, 'backend', 'templates');

  if (!fsSync.existsSync(templatesDir)) return;

  const names = (await fs.readdir(templatesDir)).filter(name => name.toLowerCase().endsWith('.html'));
  for (const name of names) {
    const filePath = path.join(templatesDir, name);
    let html = await fs.readFile(filePath, 'utf8');
    if (html.includes('id="koutilya-telugu-font"')) continue;

    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${fontCss}</head>`);
    } else {
      html = `${fontCss}${html}`;
    }

    await fs.writeFile(filePath, html, 'utf8');
  }

  console.log('[PRODUCTION FIX] Telugu font embedded into existing HTML PDF templates.');
}

try {
  await ensureLocationMaster();
  await injectTeluguFontIntoTemplates();
} catch (error) {
  console.error('[PRODUCTION FIX] Startup preparation failed:', error?.message || error);
}
