import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_FILE = path.join(__dirname, '..', 'templates', 'meeseva-logo.png');

const TEMPLATE = path.join(
  __dirname,
  '..',
  'templates',
  'late-birth.html'
);

const FIELDS = [
  'division',
  'district',
  'applicant_name',
  'relation_name',
  'age',
  'occupation',
  'house_number',
  'near',
  'mandal',
  'district2',
  'wife_name',
  'wife_age',
  'child_name',
  'date_of_birth',
  'birth_place',
  'delivery_house',
  'delivery_near',
  'delivery_mandal',
  'delivery_district',
  'authority_mandal',
  'register_mandal',
  'municipal_council',
  'landline',
  'mobile',
  'email'
];

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

router.post('/late-birth', async (req, res) => {
  let browser = null;
  let tempDir = null;

  try {
    // Read HTML template
    let html = await fs.readFile(TEMPLATE, 'utf8');
    html = html.replaceAll('{{LOGO_PATH}}', LOGO_FILE.replaceAll('\\\\', '/'));


    // Insert form values
    for (const key of FIELDS) {
      const value = req.body?.[key] ?? '';

      html = html.replaceAll(
        `{{${key}}}`,
        esc(value)
      );
    }

    // Temporary working directory
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'koutilya-birth-')
    );

    const htmlFile = path.join(
      tempDir,
      'application.html'
    );

    await fs.writeFile(
      htmlFile,
      html,
      'utf8'
    );

    // Start Chrome
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1
    });

    // Open our HTML application
    await page.goto(
      `file://${htmlFile}`,
      {
        waitUntil: 'networkidle0'
      }
    );

    // Generate A4 PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });

    // VERY IMPORTANT:
    // Convert Puppeteer's Uint8Array to a Node Buffer.
    const pdfBuffer = Buffer.from(pdf);

    console.log(
      `PDF generated successfully: ${pdfBuffer.length} bytes`
    );

    // Send REAL PDF binary data
    res.status(200);
    res.setHeader(
      'Content-Type',
      'application/pdf'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Late_Registration_Birth_Application.pdf"'
    );
    res.setHeader(
      'Content-Length',
      pdfBuffer.length
    );

    res.end(pdfBuffer);

  } catch (error) {

    console.error(
      'Late birth PDF error:',
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Unable to generate application PDF',
        error: error.message
      });
    }

  } finally {

    // Always close browser
    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }

    // Remove the unique Chrome profile
    if (chromeProfileDir) {
      await fs
        .rm(
          chromeProfileDir,
          {
            recursive: true,
            force: true
          }
        )
        .catch(() => {});
    }

    // Remove temporary HTML
    if (tempDir) {
      await fs
        .rm(
          tempDir,
          {
            recursive: true,
            force: true
          }
        )
        .catch(() => {});
    }
  }
});

export default router;