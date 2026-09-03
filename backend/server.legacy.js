import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import lateBirthPdfRouter from './routes/lateBirthPdf.js';


/* =====================================================
   BASIC SETUP
   ===================================================== */

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
   Project root:

   E:\late_birth_html
*/
const ROOT = path.join(__dirname, '..');


/* =====================================================
   GENERATED PDF DIRECTORY
   ===================================================== */

const GENERATED_DIR = path.join(
  ROOT,
  'generated'
);

/*
   Create the generated folder once at startup.

   IMPORTANT:
   recursive:true means:
   - If the folder already exists -> no EEXIST error
   - If it does not exist -> it is created
*/
await fs.mkdir(
  GENERATED_DIR,
  {
    recursive: true
  }
);


/* =====================================================
   MIDDLEWARE
   ===================================================== */

app.use(
  express.json({
    limit: '3mb'
  })
);


/* =====================================================
   FRONTEND
   ===================================================== */

app.use(
  express.static(
    path.join(ROOT, 'frontend')
  )
);


/* =====================================================
   GENERATED PDF DOWNLOADS
   ===================================================== */

app.use(
  '/generated',
  express.static(
    GENERATED_DIR
  )
);

/* =====================================================
   LATE REGISTRATION OF BIRTH
   Existing application is kept in frontend/forms/late-birth.html.
   Mount its PDF router so the form is fully connected to the main portal.
   ===================================================== */
app.use('/api/pdf', lateBirthPdfRouter);


/* =====================================================
   APPLICATION TEMPLATES
   ===================================================== */

const templates = {

  'death-affidavit-individual': [
    'death-affidavit-individual.html',
    'Death_Registration_Individual_Affidavit.pdf',
    '612pt 842pt'
  ],

  'death-affidavit-joint': [
    'death-affidavit-joint.html',
    'Death_Registration_Joint_Affidavit.pdf',
    '612pt 842pt'
  ],

  death: [
    'death.html',
    'Late_Registration_Death_Application.pdf',
    '612pt 1008pt'
  ],

  income: [
    'income.html',
    'Income_Certificate_Application.pdf',
    '612pt 792pt'
  ],

  ews: [
    'ews.html',
    'EWS_Income_Certificate_Application.pdf',
    '612pt 792pt'
  ],

  obc: [
    'obc.html',
    'OBC_Certificate_Application.pdf',
    '612pt 1008pt'
  ],

  'caste-integrated': [
    'caste-integrated.html',
    'Caste_Integrated_Application.pdf',
    '612pt 842pt'
  ],

  'family-member': [
    'family-member.html',
    'Family_Membership_Certificate_Application.pdf',
    '612pt 792pt'
  ],

  seeding: [
    'seeding.html',
    'Pattadar_Aadhaar_Seeding_Application.pdf',
    '612pt 792pt'
  ]

};


/* =====================================================
   LOGO
   ===================================================== */

const logoPath = path.join(
  ROOT,
  'frontend',
  'assets',
  'meeseva-logo.png'
);

let requireLogo = null;

if (fsSync.existsSync(logoPath)) {

  requireLogo =
    await fs.readFile(
      logoPath
    );
}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function esc(value = '') {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

}


/* =====================================================
   ADD AUTOMATIC DEATH PRONOUNS
   ===================================================== */


/* =====================================================
   AFFIDAVIT OUTPUT FORMATTING
   - Person names: UPPERCASE
   - Other text: Title Case
   - Dates: DD/MM/YYYY
   ===================================================== */
function affidavitTitleCase(value = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text.toLowerCase()
    .replace(/\b([a-z])/g, c => c.toUpperCase())
    .replace(/\bD\.No\.?\b/gi, 'D.No.')
    .replace(/\bR\/O\b/gi, 'R/o')
    .replace(/\bS\/O\b/gi, 'S/O')
    .replace(/\bD\/O\b/gi, 'D/O')
    .replace(/\bW\/O\b/gi, 'W/O')
    .replace(/\bC\/O\b/gi, 'C/O');
}

function affidavitUpper(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function affidavitDate(value = '') {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }
  let m = v.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);
  if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
  const digits = v.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
  if (digits.length === 6) return `${digits.slice(0,2)}/${digits.slice(2,4)}/20${digits.slice(4)}`;
  return v;
}

function normalizeAffidavitField(key, value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  const k = String(key || '');
  if (/date/i.test(k)) return affidavitDate(v);
  if (/(applicantName|deponentName|deceasedName|deceasedSpouse|parentName|fatherName|motherName|husbandName|wifeName|guardianName|spouseName|proprietorName|nomineeName|witnessName|nameOne|nameTwo|joint\d+Name|joint\d+Father|joint\d+Parent)/i.test(k)) return affidavitUpper(v);
  if (/(^|)(Relation|relationship|deponentRelation|applicantRelation|deceasedRelationship|joint\d+Relation)$/i.test(k)) return affidavitUpper(v);
  return affidavitTitleCase(v);
}

function normalizeAffidavitData(data = {}) {
  const out = {};
  for (const [key, value] of Object.entries(data || {})) out[key] = normalizeAffidavitField(key, value);
  return out;
}

function addDeathPronouns(data = {}) {

  const gender =
    String(
      data.deceasedGender ||
      data.gender ||
      ''
    ).trim().toLowerCase();


  /*
     IMPORTANT:
     Do not guess gender from the person's name.

     The form should send:
       Male
       Female
  */

  if (gender === 'female' || gender === 'f') {

    data.deceasedPronoun = 'she';
    data.deceasedObjectPronoun = 'her';
    data.deceasedPossessive = 'her';

  } else {

    data.deceasedPronoun = 'he';
    data.deceasedObjectPronoun = 'him';
    data.deceasedPossessive = 'his';

  }

  return data;
}


/* =====================================================
   TEMPLATE FIELD REPLACEMENT

   Supports ALL of these:

   {name}
   {{name}}

   Empty fields become empty strings.

   Entered values are NOT changed in the server;
   the HTML template controls bold/underline styling.
   ===================================================== */

function replaceFields(
  html,
  originalData = {}
) {

  const data = {
    ...originalData
  };


  /*
     Automatic male/female pronouns.
  */
  addDeathPronouns(data);


  /*
     Replace logo only when a template asks for it.
  */
  if (
    requireLogo &&
    html.includes('{{LOGO_DATA}}')
  ) {

    const logo =
      requireLogo.toString('base64');

    html = html.replaceAll(
      '{{LOGO_DATA}}',
      `data:image/png;base64,${logo}`
    );

  }


  /*
     Replace every supplied field directly.

     This is intentionally explicit rather than relying
     only on one regex, so BOTH:
       {joint1Name}
       {{joint1Name}}
     are guaranteed to work.
  */

  for (
    const [key, value]
    of Object.entries(data)
  ) {

    const safeValue =
      value === undefined ||
      value === null
        ? ''
        : esc(String(value));


    /*
       Single braces
    */
    html = html.replaceAll(
      `{${key}}`,
      safeValue
    );


    /*
       Double braces
    */
    html = html.replaceAll(
      `{{${key}}}`,
      safeValue
    );

  }


  /*
     Safety cleanup.

     If a placeholder exists in the template but the
     frontend did not send that field, never allow
     {fieldName} or {{fieldName}} to appear in the PDF.
  */

  html = html.replace(
    /\{\{?\s*[a-zA-Z0-9_]+\s*\}?\}/g,
    ''
  );


  return html;
}


/* =====================================================
   HEALTH CHECK
   ===================================================== */

app.get(
  '/api/health',
  (req, res) => {

    res.json({
      success: true
    });

  }
);


/* =====================================================
   AP LOCATION CSV
   ===================================================== */

app.get(
  '/api/locations',
  async (req, res) => {

    try {

      const possibleFiles = [

        path.join(
          ROOT,
          'andhra_pradesh_villages.csv'
        ),

        path.join(
          ROOT,
          'frontend',
          'andhra_pradesh_villages.csv'
        ),

        path.join(
          ROOT,
          'backend',
          'templates',
          'andhra_pradesh_villages.csv'
        )

      ];


      let csvPath = null;


      for (
        const filePath of possibleFiles
      ) {

        if (
          fsSync.existsSync(filePath)
        ) {

          csvPath = filePath;
          break;

        }

      }


      console.log(
        'Location CSV requested'
      );


      if (!csvPath) {

        console.error(
          'AP LOCATION CSV NOT FOUND'
        );

        possibleFiles.forEach(
          file =>
            console.error(file)
        );


        return res.status(404).json({

          success: false,

          error:
            'andhra_pradesh_villages.csv not found',

          checked:
            possibleFiles

        });

      }


      console.log(
        'Using location CSV:',
        csvPath
      );


      const csv =
        await fs.readFile(
          csvPath,
          'utf8'
        );


      res.setHeader(
        'Content-Type',
        'text/csv; charset=utf-8'
      );


      return res.send(csv);

    }

    catch (error) {

      console.error(
        'Location CSV error:',
        error
      );


      return res.status(500).json({

        success: false,

        error:
          error.message ||
          'Unable to load location data'

      });

    }

  }
);


/* =====================================================
   AFFIDAVITS & DECLARATIONS CATALOG
   -----------------------------------------------------
   This is an additive module.
   Existing application routes are left unchanged.
   ===================================================== */

const AFFIDAVIT_CATALOG_PATH =
  path.join(
    ROOT,
    'backend',
    'data',
    'affidavit-catalog.json'
  );

let affidavitCatalog = [];

try {
  if (fsSync.existsSync(AFFIDAVIT_CATALOG_PATH)) {
    affidavitCatalog = JSON.parse(
      await fs.readFile(
        AFFIDAVIT_CATALOG_PATH,
        'utf8'
      )
    );
  }
} catch (error) {
  console.error(
    'Affidavit catalog load error:',
    error
  );
  affidavitCatalog = [];
}

app.get(
  '/api/affidavits',
  (req, res) => {
    res.json({
      success: true,
      count: affidavitCatalog.length,
      services: affidavitCatalog
    });
  }
);

app.get(
  '/api/affidavits/:id',
  (req, res) => {
    const item = affidavitCatalog.find(
      entry => entry.id === req.params.id
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Affidavit service not found'
      });
    }

    return res.json({
      success: true,
      service: item
    });
  }
);


/* =====================================================
   DEATH REGISTRATION AFFIDAVIT
   ONE APPLICATION -> TWO SEPARATE PDFs

   IMPORTANT:
   - No mkdir here
   - GENERATED_DIR was already created at startup
   - Individual and Joint are generated separately
   ===================================================== */

app.post(
  '/api/pdf/death-affidavit',
  async (req, res) => {

    let browser = null;

    try {

      /* ---------------------------------------------
         FORM DATA
         --------------------------------------------- */

      const data =
        normalizeAffidavitData(addDeathPronouns({
          ...(req.body || {})
        }));


      console.log(
        ''
      );

      console.log(
        '========== DEATH AFFIDAVIT DATA =========='
      );

      console.log(
        JSON.stringify(
          data,
          null,
          2
        )
      );

      console.log(
        '==========================================='
      );


      /* ---------------------------------------------
         REQUIRED FIELD
         --------------------------------------------- */

      if (!data.deceasedName) {

        return res.status(400).json({

          success: false,

          message:
            'Deceased name is required'

        });

      }


      /* ---------------------------------------------
         TEMPLATE PATHS
         --------------------------------------------- */

      const individualTemplatePath =
        path.join(
          ROOT,
          'backend',
          'templates',
          'death-affidavit-individual.html'
        );


      const jointTemplatePath =
        path.join(
          ROOT,
          'backend',
          'templates',
          'death-affidavit-joint.html'
        );


      /* ---------------------------------------------
         CHECK TEMPLATES
         --------------------------------------------- */

      if (
        !fsSync.existsSync(
          individualTemplatePath
        )
      ) {

        return res.status(500).json({

          success: false,

          message:
            'Individual affidavit template not found',

          path:
            individualTemplatePath

        });

      }


      if (
        !fsSync.existsSync(
          jointTemplatePath
        )
      ) {

        return res.status(500).json({

          success: false,

          message:
            'Joint affidavit template not found',

          path:
            jointTemplatePath

        });

      }


      /* ---------------------------------------------
         READ TEMPLATES
         --------------------------------------------- */

      let individualHtml =
        await fs.readFile(
          individualTemplatePath,
          'utf8'
        );


      let jointHtml =
        await fs.readFile(
          jointTemplatePath,
          'utf8'
        );


      console.log(
        'Individual template:',
        individualTemplatePath
      );

      console.log(
        'Joint template:',
        jointTemplatePath
      );


      /* ---------------------------------------------
         REPLACE FORM DATA
         --------------------------------------------- */

      individualHtml =
        replaceFields(
          individualHtml,
          data
        );


      jointHtml =
        replaceFields(
          jointHtml,
          data
        );


      /*
         HARD CHECK:

         If any known placeholder is still present,
         log it before Puppeteer runs.
      */

      console.log(
        'Individual unresolved placeholders:',
        (
          individualHtml.match(
            /\{\{?\s*[a-zA-Z0-9_]+\s*\}?\}/g
          ) || []
        )
      );

      console.log(
        'Joint unresolved placeholders:',
        (
          jointHtml.match(
            /\{\{?\s*[a-zA-Z0-9_]+\s*\}?\}/g
          ) || []
        )
      );


      /* ---------------------------------------------
         LAUNCH PUPPETEER
         --------------------------------------------- */

      browser =
        await puppeteer.launch({

          headless: true,

          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]

        });


      const page =
        await browser.newPage();


      /* =================================================
         PDF 1
         INDIVIDUAL AFFIDAVIT
         ================================================= */

      await page.setContent(
        individualHtml,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );


      const individualPdf =
        await page.pdf({

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


      const timestamp =
        Date.now();


      const individualFileName =
        `Death_Registration_Individual_${timestamp}.pdf`;


      const individualFilePath =
        path.join(
          GENERATED_DIR,
          individualFileName
        );


      await fs.writeFile(
        individualFilePath,
        Buffer.from(individualPdf)
      );


      console.log(
        'Individual PDF created:',
        individualFilePath
      );


      /* =================================================
         PDF 2
         JOINT AFFIDAVIT
         ================================================= */

      await page.setContent(
        jointHtml,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );


      const jointPdf =
        await page.pdf({

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


      const jointFileName =
        `Death_Registration_Joint_${timestamp}.pdf`;


      const jointFilePath =
        path.join(
          GENERATED_DIR,
          jointFileName
        );


      await fs.writeFile(
        jointFilePath,
        Buffer.from(jointPdf)
      );


      console.log(
        'Joint PDF created:',
        jointFilePath
      );


      /* ---------------------------------------------
         CLOSE BROWSER
         --------------------------------------------- */

      await browser.close();

      browser = null;


      /* ---------------------------------------------
         DOWNLOAD URLS
         --------------------------------------------- */

      const baseUrl =
        `${req.protocol}://${req.get('host')}`;


      /* ---------------------------------------------
         RETURN TWO PDF LINKS
         --------------------------------------------- */

      return res.json({

        success: true,

        message:
          'Two affidavit PDFs generated successfully',

        individualPdf:
          `${baseUrl}/generated/${individualFileName}`,

        jointPdf:
          `${baseUrl}/generated/${jointFileName}`

      });

    }

    catch (error) {

      console.error(
        'Death affidavit generation error:',
        error
      );


      if (browser) {

        await browser
          .close()
          .catch(
            () => {}
          );

      }


      if (!res.headersSent) {

        return res.status(500).json({

          success: false,

          message:
            error.message ||
            'Death affidavit PDF generation failed'

        });

      }

    }

  }
);


/* =====================================================
   FAMILY MEMBER CERTIFICATE AFFIDAVIT
   One affidavit; continuation pages are A4.
   The first page reserves 6 inches of blank space for
   non-judicial stamp paper, with 1 inch side/bottom margins.
   ===================================================== */

function familyTitleCase(value = '') { return affidavitTitleCase(value); }
function familyUpper(value = '') { return affidavitUpper(value); }

function familyRowsHtml(members = []) {
  return members.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(familyUpper(m.name || ''))}</td><td>${esc(m.age || '')}</td><td>${esc(familyUpper(m.parent || ''))}</td><td>${esc(familyTitleCase(m.relationship || ''))}</td><td>${esc(m.aadhaar || '')}</td></tr>`).join('');
}

function witnessRowsHtml(witnesses = []) {
  return witnesses.map((w, i) => `<div class="sig">${i + 1}. __________________________________ (${esc(familyUpper(w.name || ''))})</div>`).join('');
}

app.post('/api/pdf/family-member-affidavit', async (req, res) => {
  let browser = null;
  let tmp = null;
  try {
    const data = normalizeAffidavitData(req.body || {});
    if (!data.deceasedName || !data.dateOfDeath || !data.applicantName) {
      return res.status(400).json({ success: false, message: 'Deceased name, date of death and applicant name are required' });
    }
    const members = Array.isArray(data.familyMembers) ? data.familyMembers.filter(x => x && x.name) : [];
    const witnesses = Array.isArray(data.witnesses) ? data.witnesses.filter(x => x && x.name) : [];
    if (!members.length) return res.status(400).json({ success: false, message: 'At least one family member is required' });
    if (!witnesses.length) return res.status(400).json({ success: false, message: 'At least one deponent / witness is required' });

    const templatePath = path.join(ROOT, 'backend', 'templates', 'family-member-affidavit.html');
    let html = await fs.readFile(templatePath, 'utf8');
    const replacements = {
      deceasedName: familyUpper(data.deceasedName),
      deceasedRelationName: familyTitleCase(data.deceasedRelationName),
      deceasedAddress: familyTitleCase(data.deceasedAddress),
      dateOfDeath: data.dateOfDeath,
      applicantName: familyUpper(data.applicantName),
      applicantRelationship: familyTitleCase(data.applicantRelationship),
      purpose: familyTitleCase(data.purpose || 'official use'),
      familyRows: familyRowsHtml(members),
      witnessRows: witnessRowsHtml(witnesses)
    };
    for (const [key, value] of Object.entries(replacements)) html = html.replaceAll(`{{${key}}}`, value ?? '');
    html = html.replace(/\{\{[^}]+\}\}/g, '');

    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'koutilya-family-affidavit-'));
    const file = path.join(tmp, 'family-member-affidavit.html');
    await fs.writeFile(file, html, 'utf8');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: {top:0,right:0,bottom:0,left:0} });
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="Family_Member_Certificate_Affidavit.pdf"');
    return res.end(Buffer.from(pdf));
  } catch (error) {
    console.error('Family Member affidavit PDF error:', error);
    if (!res.headersSent) return res.status(500).json({ success:false, message:error.message || 'PDF generation failed' });
  } finally {
    if (browser) await browser.close().catch(()=>{});
    if (tmp) await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});
  }
});


/* =====================================================
   ONE & SAME PERSON AFFIDAVIT
   One document. Page 1 reserves 6 inches for
   non-judicial stamp paper; continuation flows on A4.
   ===================================================== */

function oneSameTitleCase(value = '') {
  return String(value).trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function oneSameUpper(value = '') {
  return String(value).trim().toUpperCase();
}

app.post('/api/pdf/one-same-person-affidavit', async (req, res) => {
  let browser = null;
  let tmp = null;

  try {
    const data = normalizeAffidavitData(req.body || {});

    const required = [
      ['applicantName', 'Applicant name'],
      ['nameOne', 'First name'],
      ['nameTwo', 'Second name'],
      ['documentOne', 'First document'],
      ['documentTwo', 'Second document'],
      ['reason', 'Reason for variation'],
      ['address', 'Address']
    ];

    for (const [key, label] of required) {
      if (!String(data[key] || '').trim()) {
        return res.status(400).json({
          success: false,
          message: `${label} is required`
        });
      }
    }

    const templatePath = path.join(
      ROOT,
      'backend',
      'templates',
      'one-same-person-affidavit.html'
    );

    let html = await fs.readFile(templatePath, 'utf8');

    const replacements = {
      applicantName: oneSameUpper(data.applicantName),
      applicantRelation: oneSameUpper(data.applicantRelation || 'S/O'),
      parentOrSpouseName: oneSameUpper(data.parentOrSpouseName || ''),
      age: data.age || '',
      address: oneSameTitleCase(data.address),
      nameOne: oneSameUpper(data.nameOne),
      nameTwo: oneSameUpper(data.nameTwo),
      documentOne: oneSameTitleCase(data.documentOne),
      documentTwo: oneSameTitleCase(data.documentTwo),
      reason: oneSameTitleCase(data.reason),
      purposeAuthority: oneSameTitleCase(data.purposeAuthority || 'the concerned authority'),
      place: affidavitTitleCase(data.place),
      executionDate: affidavitDate(data.executionDate)
    };

    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, esc(value ?? ''));
    }

    html = html.replace(/\{\{[^}]+\}\}/g, '');

    tmp = await fs.mkdtemp(
      path.join(os.tmpdir(), 'koutilya-one-same-person-')
    );

    const file = path.join(
      tmp,
      'one-same-person-affidavit.html'
    );

    await fs.writeFile(file, html, 'utf8');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();

    await page.goto(
      `file://${file}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

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

    const fileName =
      `One_Same_Person_Affidavit_${Date.now()}.pdf`;

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    return res.end(Buffer.from(pdf));

  } catch (error) {

    console.error(
      'One & Same Person affidavit PDF error:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'PDF generation failed'
      });
    }

  } finally {

    if (browser) {
      await browser.close().catch(() => {});
    }

    if (tmp) {
      await fs.rm(
        tmp,
        {
          recursive: true,
          force: true
        }
      ).catch(() => {});
    }

  }
});


/* =====================================================
   GENERIC PDF GENERATION
   EXISTING SERVICES

   Do not disturb the existing applications.
   ===================================================== */

/* =====================================================
   NAME DIFFERENCE AFFIDAVIT
   Single document. Page 1 stamp-paper reserved area;
   continuation pages flow naturally onto A4.
   ===================================================== */
app.post('/api/pdf/name-difference-affidavit', async (req, res) => {
  let browser = null;
  let tmp = null;
  try {
    const data = normalizeAffidavitData(req.body || {});
    const required = [
      ['applicantName','Applicant / Declarant name'], ['relation','Relation'],
      ['parentName','Father / Husband / Guardian name'], ['age','Age'], ['address','Full address'],
      ['correctName','Correct / Preferred name'], ['recordName','Name as appearing in record'],
      ['documentName','Document / record'], ['differenceType','Nature of difference'],
      ['reason','Reason / explanation'], ['purposeAuthority','Concerned authority / purpose'],
      ['place','Place of execution'], ['executionDate','Date of execution']
    ];
    for (const [key,label] of required) {
      if (!String(data[key] || '').trim()) return res.status(400).json({success:false,message:`${label} is required`});
    }
    const templatePath=path.join(ROOT,'backend','templates','name-difference-affidavit.html');
    let html=await fs.readFile(templatePath,'utf8');
    const titleCase=v=>String(v||'').trim().toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    const upper=v=>String(v||'').trim().toUpperCase();
    const replacements={applicantName:upper(data.applicantName),relation:upper(data.relation),parentName:upper(data.parentName),age:data.age,address:titleCase(data.address),correctName:upper(data.correctName),recordName:upper(data.recordName),documentName:titleCase(data.documentName),differenceType:titleCase(data.differenceType),reason:titleCase(data.reason),purposeAuthority:titleCase(data.purposeAuthority),place:titleCase(data.place),executionDate:data.executionDate};
    for (const [key,value] of Object.entries(replacements)) html=html.replaceAll(`{{${key}}}`,esc(value));
    html=html.replace(/\{\{[^}]+\}\}/g,'');
    tmp=await fs.mkdtemp(path.join(os.tmpdir(),'koutilya-name-difference-'));
    const file=path.join(tmp,'name-difference-affidavit.html'); await fs.writeFile(file,html,'utf8');
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
    const page=await browser.newPage(); await page.goto(`file://${file}`,{waitUntil:'domcontentloaded',timeout:30000});
    const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:0,right:0,bottom:0,left:0}});
    res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','attachment; filename="Name_Difference_Affidavit.pdf"'); return res.end(Buffer.from(pdf));
  } catch(error) {
    console.error('Name difference affidavit PDF error:',error);
    if(!res.headersSent) return res.status(500).json({success:false,message:error.message||'Name difference affidavit PDF generation failed'});
  } finally {
    if(browser) await browser.close().catch(()=>{});
    if(tmp) await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});
  }
});

/* =====================================================
   UNIVERSAL AFFIDAVIT / DECLARATION GENERATOR
   All catalogue services without a dedicated prescribed
   live form use this route. It creates a citizen-use draft,
   never an authority-branded or claimed-official format.
   ===================================================== */
app.post('/api/pdf/affidavit/:id', async (req, res) => {
  let browser = null;
  let tmp = null;
  try {
    const service = affidavitCatalog.find(x => x.id === req.params.id);
    if (!service) return res.status(404).json({success:false,message:'Affidavit service not found'});

    const data = req.body || {};
    const fields = Array.isArray(service.fields) ? service.fields : [];
    for (let i=0;i<fields.length;i++) {
      if (fields[i].required && !String(data[`field_${i}`] || '').trim()) {
        return res.status(400).json({success:false,message:`${fields[i].label} is required`});
      }
    }
    if (!String(data.execution_place || '').trim()) return res.status(400).json({success:false,message:'Place of execution is required'});
    if (!String(data.execution_date || '').trim()) return res.status(400).json({success:false,message:'Date of execution is required'});

    const normalizeDate = raw => {
      const v = String(raw || '').trim();
      if (!v) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y,mo,d]=v.split('-'); return `${d}/${mo}/${y}`; }
      let m = v.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);
      if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
      const digits = v.replace(/\D/g,'');
      if (digits.length === 8) return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
      if (digits.length === 6) return `${digits.slice(0,2)}/${digits.slice(2,4)}/20${digits.slice(4)}`;
      return v;
    };
    const titleCase = raw => String(raw || '').trim().toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase());
    const isPersonNameField = label => /\b(name)\b|father|mother|husband|wife|guardian|parent|deponent|deceased|applicant|proprietor|person/i.test(String(label||''));
    const isDateField = (field, index) => field?.type === 'date' || /\bdate\b|date of birth|dob|year of birth|date of death/i.test(String(field?.label||''));
    const formatValue = (field, raw, index) => {
      const v = String(raw || '').trim();
      if (!v) return '';
      if (isDateField(field,index)) return normalizeDate(v);
      if (isPersonNameField(field?.label)) return titleCase(v).toUpperCase();
      return titleCase(v);
    };
    const val = i => formatValue(fields[i], data[`field_${i}`], i);
    const escDoc = v => esc(v).replace(/\n/g,'<br>');
    const applicantIndex = fields.findIndex(f => /applicant|declarant|proprietor|person name|name of applicant/i.test(f.label||''));
    const relationIndex = fields.findIndex(f => /relation|relationship/i.test(f.label||''));
    const ageIndex = fields.findIndex(f => /^age/i.test(f.label||''));
    const addressIndex = fields.findIndex(f => /address/i.test(f.label||''));
    const applicant = applicantIndex >= 0 ? val(applicantIndex) : '';
    const relation = relationIndex >= 0 ? val(relationIndex) : '';
    const age = ageIndex >= 0 ? val(ageIndex) : '';
    const address = addressIndex >= 0 ? val(addressIndex) : '';

    let lead = `I, <strong>${escDoc(applicant || 'the undersigned declarant')}</strong>`;
    if (relation) lead += `, <strong>${escDoc(relation)}</strong>`;
    if (age) lead += `, aged <strong>${escDoc(age)}</strong> years`;
    if (address) lead += `, residing at <strong>${escDoc(address)}</strong>`;
    lead += `, do hereby solemnly affirm and declare as follows:`;

    const category = String(service.category||'').toLowerCase();
    let context = `I am making this declaration in connection with <strong>${escDoc(service.title)}</strong> and for the purpose stated by the receiving authority.`;
    if (category.includes('identity')) context = 'I am the person concerned in the records referred to below and I am competent to make this declaration about my identity and particulars.';
    else if (category.includes('family') || category.includes('succession')) context = 'I am concerned with the family / succession particulars referred to below and I am making this declaration from my personal knowledge and records available to me.';
    else if (category.includes('property') || category.includes('land')) context = 'I am making this declaration concerning the property / land particulars stated below and the facts are true to the best of my knowledge and belief.';
    else if (category.includes('income') || category.includes('welfare')) context = 'I am making this declaration concerning my income, financial or welfare particulars for the relevant service.';
    else if (category.includes('education') || category.includes('employment')) context = 'I am making this declaration concerning my educational / employment particulars for the relevant purpose.';
    else if (category.includes('passport') || category.includes('travel')) context = 'I am making this declaration for the passport / travel-related purpose stated in the application and understand that the receiving authority may require its prescribed annexure.';
    else if (category.includes('bank') || category.includes('finance') || category.includes('insurance')) context = 'I am making this declaration concerning the financial / account / claim particulars stated below for the relevant institution or authority.';
    else if (category.includes('transport')) context = 'I am making this declaration concerning the vehicle / transport record stated below for the relevant authority.';
    else if (category.includes('utility') || category.includes('municipal')) context = 'I am making this declaration concerning the utility / municipal particulars stated below for the relevant authority.';

    const skip = new Set([applicantIndex, relationIndex, ageIndex, addressIndex]);
    const statements = [];
    for (let i=0;i<fields.length;i++) {
      if (skip.has(i)) continue;
      const value = val(i);
      if (!value) continue;
      const label = fields[i].label || `Particular ${i+1}`;
      statements.push(`<strong>${escDoc(label)}</strong> is <strong>${escDoc(value)}</strong>`);
    }
    const detailSentence = statements.length
      ? ` I further state and declare that ${statements.join('; ')}.`
      : '';
    const purposeSentence = service.purpose
      ? ` I am executing this affidavit / declaration for the purpose of <strong>${escDoc(service.purpose)}</strong> and request the concerned authority / institution to consider this declaration together with the supporting records.`
      : '';
    const oneParagraph = `${lead}&nbsp;&nbsp;${context}${detailSentence ? '&nbsp;&nbsp;&nbsp;&nbsp;' + detailSentence.trim() : ''}${purposeSentence ? '&nbsp;&nbsp;&nbsp;&nbsp;' + purposeSentence.trim() : ''}&nbsp;&nbsp;&nbsp;&nbsp;I verify that the statements made herein are true and correct to the best of my knowledge and belief and that no material fact has been concealed.`;
    const executionDate = normalizeDate(data.execution_date);
    const executionPlace = titleCase(data.execution_place);

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:"Times New Roman",serif;font-size:10pt;line-height:1.15}.document{padding:6in 1in 1in 1in;min-height:11.69in;display:flex;flex-direction:column}.title{text-align:center;font-weight:700;font-size:13pt;margin:0 0 14px;text-transform:uppercase;text-decoration:underline;text-underline-offset:2px}.body{display:flex;flex:1;flex-direction:column;min-height:0}.body p{margin:0;text-align:justify;word-spacing:.04em;line-height:1.16}.verification{margin-top:10px}.sign-row{display:flex;justify-content:flex-end;margin-top:12px}.signature{text-align:center;min-width:150px}.line{border-top:1px solid #111;margin-bottom:3px}.place-date{margin-top:10px}.notary{text-align:center;margin-top:auto;padding-top:12px;font-weight:700}.notary-spacer{height:12px}.notary-line{margin-top:5px}
    </style></head><body><main class="document"><h1 class="title">${escDoc(service.title)}</h1><div class="body"><p>${oneParagraph}</p><div class="place-date"><div>Place: <strong>${escDoc(executionPlace)}</strong></div><div>Date: <strong>${escDoc(executionDate)}</strong></div></div><div class="sign-row"><div class="signature"><div class="line"></div><strong>DEPONENT / DECLARANT</strong></div></div><div class="notary"><div>BEFORE ME</div><div class="notary-spacer"></div><div class="line notary-line"></div><div>NOTARY PUBLIC / COMPETENT AUTHORITY</div></div></div></main></body></html>`;

    tmp = await fs.mkdtemp(path.join(os.tmpdir(),'koutilya-universal-affidavit-'));
    const file = path.join(tmp,'affidavit.html');
    await fs.writeFile(file, html, 'utf8');
    browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.goto(`file://${file}`,{waitUntil:'domcontentloaded',timeout:30000});
    const pdf = await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:0,right:0,bottom:0,left:0}});
    const filename = (service.title || 'Affidavit').replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'')+'.pdf';
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    return res.end(Buffer.from(pdf));
  } catch (error) {
    console.error('Universal affidavit PDF error:',error);
    if(!res.headersSent) return res.status(500).json({success:false,message:error.message||'PDF generation failed'});
  } finally {
    if(browser) await browser.close().catch(()=>{});
    if(tmp) await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});
  }
});

app.post(
  '/api/pdf/:name',
  async (req, res) => {

    const cfg =
      templates[
        req.params.name
      ];


    if (!cfg) {

      return res.status(404).json({

        success: false,

        message:
          'Unknown application'

      });

    }


    let browser = null;
    let tmp = null;


    try {

      /* ---------------------------------------------
         TEMPLATE
         --------------------------------------------- */

      const templatePath =
        path.join(
          ROOT,
          'backend',
          'templates',
          cfg[0]
        );


      console.log(
        'PDF template:',
        templatePath
      );


      const source =
        await fs.readFile(
          templatePath,
          'utf8'
        );


      /* ---------------------------------------------
         REPLACE FIELDS
         --------------------------------------------- */

      const html =
        replaceFields(
          source,
          req.body || {}
        );


      /* ---------------------------------------------
         TEMP DIRECTORY
         --------------------------------------------- */

      tmp =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'koutilya-html7-'
          )
        );


      const file =
        path.join(
          tmp,
          'application.html'
        );


      await fs.writeFile(
        file,
        html,
        'utf8'
      );


      /* ---------------------------------------------
         PUPPETEER
         --------------------------------------------- */

      browser =
        await puppeteer.launch({

          headless: true,

          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]

        });


      const page =
        await browser.newPage();


      await page.goto(
        `file://${file}`,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );


      /* ---------------------------------------------
         PDF
         --------------------------------------------- */

      const pdf =
        await page.pdf({

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


      /* ---------------------------------------------
         RESPONSE
         --------------------------------------------- */

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );


      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cfg[1]}"`
      );


      return res.end(
        Buffer.from(pdf)
      );

    }

    catch (error) {

      console.error(
        `${req.params.name} PDF error:`,
        error
      );


      if (!res.headersSent) {

        return res.status(500).json({

          success: false,

          message:
            error.message ||
            'PDF generation failed'

        });

      }

    }

    finally {

      if (browser) {

        await browser
          .close()
          .catch(
            () => {}
          );

      }


      if (tmp) {

        await fs
          .rm(
            tmp,
            {
              recursive: true,
              force: true
            }
          )
          .catch(
            () => {}
          );

      }

    }

  }
);



/* =====================================================
   START SERVER
   ===================================================== */

const PORT =
  process.env.PORT || 5000;


app.listen(
  PORT,
  () => {

    console.log('');

    console.log(
      '=========================================='
    );

    console.log(
      'KOUTILYA HTML PDF SERVER'
    );

    console.log(
      '=========================================='
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Location API: http://localhost:${PORT}/api/locations`
    );

    console.log(
      `Generated PDFs: ${GENERATED_DIR}`
    );

    console.log(
      '=========================================='
    );

    console.log('');

  }
);
