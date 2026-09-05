import { AsyncLocalStorage } from 'node:async_hooks';
import express from 'express';
import puppeteer from 'puppeteer';
import { mutate, hashPassword, randomPassword, id, now } from './portal-db.js';

// server.js currently references resumeTitleCase from the resume skill formatter.
globalThis.resumeTitleCase = (value) => {
  const s = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase());
};

const resumeContext = new AsyncLocalStorage();
const originalPost = express.application.post;

// Production-safe registration override. Render Free blocks outbound SMTP ports
// 25, 465 and 587, so registration must never delete an account just because
// an external email provider is unavailable.
// Resend is still attempted over HTTPS when configured. If delivery fails,
// the account remains active and the one-time temporary credentials are returned
// over the existing HTTPS registration response so the citizen can log in and
// immediately change the password.
function registerCitizenHandler(req, res) {
  return (async () => {
    try {
      const name = String(req.body?.name || '').trim();
      const mobile = String(req.body?.mobile || '').replace(/\D/g, '');
      const email = String(req.body?.email || '').trim().toLowerCase();
      const city = String(req.body?.city || '').trim();

      if (!name || !/^[6-9]\d{9}$/.test(mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !city) {
        return res.status(400).json({ success: false, message: 'Enter valid name, 10-digit mobile, email and city.' });
      }

      const result = await mutate(db => {
        if (db.users.some(u => u.mobile === mobile)) throw new Error('This mobile number is already registered.');
        if (db.users.some(u => u.email === email)) throw new Error('This email address is already registered.');

        let userId;
        do {
          db.counters.user += 1;
          userId = `KSPL${db.counters.user}`;
        } while (db.users.some(u => u.userId === userId));

        const password = randomPassword();
        const user = {
          id: id('usr'),
          userId,
          name,
          mobile,
          email,
          city,
          passwordHash: hashPassword(password),
          mustChangePassword: true,
          walletBalance: 0,
          pdfEntitlements: [],
          active: true,
          createdAt: now()
        };

        db.users.push(user);
        return { user, password };
      });

      const msg = `Koutilya Solutions Citizen Portal\nUser ID: ${result.user.userId}\nTemporary Password: ${result.password}\nPlease login and change your password immediately.`;
      let emailSent = false;
      const resendKey = String(process.env.RESEND_API_KEY || '').trim();

      if (resendKey) {
        try {
          const from = process.env.MAIL_FROM || 'info@koutilyasolutions.in';
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from,
              to: [email],
              subject: 'Koutilya Citizen Portal Login Credentials',
              text: msg,
              html: msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
            })
          });
          emailSent = r.ok;
          if (!r.ok) console.error('REGISTRATION RESEND ERROR', r.status, await r.text().catch(() => ''));
        } catch (e) {
          console.error('REGISTRATION EMAIL ERROR', e?.message || e);
        }
      }

      if (emailSent) {
        return res.json({
          success: true,
          emailSent: true,
          userId: result.user.userId,
          message: 'Registration successful. Your User ID and temporary password have been sent to your registered email address.'
        });
      }

      console.warn('REGISTRATION EMAIL UNAVAILABLE; ACCOUNT RETAINED', {
        userId: result.user.userId,
        email
      });

      return res.json({
        success: true,
        emailSent: false,
        userId: result.user.userId,
        temporaryPassword: result.password,
        message: 'Registration successful, but the credential email could not be sent right now. Use the User ID and temporary password shown below to log in, then change your password immediately.'
      });
    } catch (e) {
      console.error('REGISTER OVERRIDE ERROR', e);
      return res.status(409).json({ success: false, message: e.message || 'Registration failed.' });
    }
  })();
}

express.application.post = function(path, ...handlers) {
  if (path === '/api/auth/register') {
    return originalPost.call(this, path, registerCitizenHandler);
  }

  if (path === '/api/resume/generate') {
    const wrapped = handlers.map((handler, index) => {
      if (index !== handlers.length - 1 || typeof handler !== 'function') return handler;
      return function resumeDesignContext(req, res, next) {
        const raw = Number(req.body?.designId || req.body?.resumeDesign || 1);
        const design = Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : 1;
        return resumeContext.run(design, () => handler(req, res, next));
      };
    });
    return originalPost.call(this, path, ...wrapped);
  }

  return originalPost.call(this, path, ...handlers);
};

const originalLaunch = puppeteer.launch.bind(puppeteer);
puppeteer.launch = async function(...args) {
  const browser = await originalLaunch(...args);
  const originalNewPage = browser.newPage.bind(browser);
  browser.newPage = async function(...pageArgs) {
    const page = await originalNewPage(...pageArgs);
    const originalSetContent = page.setContent.bind(page);
    page.setContent = async function(html, options) {
      const design = resumeContext.getStore();
      if (!design || !String(html).includes('theme-')) return originalSetContent(html, options);
      return originalSetContent(applyResumeDesign(String(html), design), options);
    };
    return page;
  };
  return browser;
};

function applyResumeDesign(html, design) {
  const css = designCss(design);
  const marker = `<style id="kspl-five-design">${css}</style>`;
  return html.includes('</head>') ? html.replace('</head>', `${marker}</head>`) : `${marker}${html}`;
}

function designCss(design) {
  const common = `
.resume-photo{border-radius:50%!important;object-fit:cover!important}
.page{color:#263b4d!important}
`; 
  if (design === 1) return common + `
/* 1 Modern Professional — two-column sidebar */
.page{padding:0!important;display:grid!important;grid-template-columns:31% 69%;grid-template-rows:auto 1fr;min-height:297mm!important}
.head{grid-column:1/3!important;background:#194c6d!important;color:#fff!important;padding:12mm 13mm!important;border:0!important;margin:0!important;display:flex!important;align-items:center!important}
.head h1,.head .role,.head .contact,.head .link{color:#fff!important}.head h1{font-size:25pt!important}.head .contact span{color:#d4e6ef!important}
.summary{grid-column:2!important;grid-row:2!important;margin:0!important;padding:10mm 13mm!important}
.section:nth-of-type(1){grid-column:1!important;grid-row:2!important;background:#edf3f6!important;margin:0!important;padding:10mm 8mm!important;border:0!important}
.section:nth-of-type(n+2){grid-column:2!important;margin:0!important;padding:0 13mm 4mm!important}
.section:nth-of-type(2){padding-top:0!important}.section-title{color:#1b5e82!important}
.summary strong{color:#1b5e82!important}
`;
  if (design === 2) return common + `
/* 2 Elegant Sidebar — dark teal left rail */
.page{padding:0!important;display:grid!important;grid-template-columns:34% 66%;grid-template-rows:auto 1fr;min-height:297mm!important}
.head{grid-column:1/3!important;background:#0d5f5c!important;color:#fff!important;padding:11mm 12mm!important;border:0!important;margin:0!important}
.head h1,.head .role,.head .contact,.head .link{color:#fff!important}.head .contact span{color:#a8dedb!important}
.summary{grid-column:2!important;grid-row:2!important;margin:0!important;padding:10mm 12mm!important}
.section:nth-of-type(1){grid-column:1!important;grid-row:2!important;background:#0d5f5c!important;color:#fff!important;margin:0!important;padding:10mm 8mm!important}
.section:nth-of-type(1) .section-title,.section:nth-of-type(1) .skills{color:#fff!important}.section:nth-of-type(n+2){grid-column:2!important;margin:0!important;padding:0 12mm 4mm!important}.section-title{color:#0d5f5c!important}
`;
  if (design === 3) return common + `
/* 3 Clean Corporate — ATS-first single column */
.page{padding:14mm 17mm!important;display:block!important}
.head{background:#fff!important;color:#24384d!important;border-bottom:0!important;padding:0 0 8mm!important;margin:0!important;display:block!important}
.head h1{color:#173b55!important;font-size:27pt!important}.head .role{color:#4d6478!important}.head .contact{color:#637383!important}
.summary{margin-top:8mm!important;border-top:1px solid #cbd4dc!important;padding-top:5mm!important}
.section{margin-top:8mm!important}.section-title{background:#e7eaed!important;color:#253847!important;padding:4px 7px!important}.section-title:after{display:none!important}
`;
  if (design === 4) return common + `
/* 4 Premium Timeline — experience/date timeline */
.page{padding:0!important;display:block!important}
.head{background:#243f58!important;color:#fff!important;padding:12mm 15mm!important;border:0!important;margin:0!important}.head h1,.head .role,.head .contact,.head .link{color:#fff!important}
.summary{margin:0!important;padding:8mm 15mm 2mm!important;border-bottom:1px solid #d5dee5!important}
.section{margin:0!important;padding:5mm 15mm!important}.section-title{color:#243f58!important}.section:nth-of-type(2){border-left:3px solid #1a6f7a!important;margin-left:20mm!important;padding-left:8mm!important}.section:nth-of-type(2) .job-meta{color:#1a6f7a!important;font-weight:700!important}
`;
  return common + `
/* 5 Premium Two-Column — centered premium header + balanced columns */
.page{padding:0!important;display:grid!important;grid-template-columns:38% 62%;grid-template-rows:auto auto 1fr;min-height:297mm!important}
.head{grid-column:1/3!important;text-align:center!important;display:block!important;background:#fff!important;color:#173b55!important;border-bottom:1px solid #d8e0e5!important;padding:10mm 14mm 7mm!important;margin:0!important}.head h1,.head .role{color:#173b55!important}.head .contact{color:#607383!important}.head .photo{margin:0 auto 4mm!important}
.summary{grid-column:1/3!important;margin:0!important;padding:6mm 14mm!important;background:#f2f5f7!important}
.section:nth-of-type(1){grid-column:1!important;grid-row:3!important;background:#f2f5f7!important;margin:0!important;padding:7mm 9mm!important}.section:nth-of-type(2),.section:nth-of-type(3),.section:nth-of-type(4),.section:nth-of-type(5),.section:nth-of-type(6),.section:nth-of-type(7){grid-column:2!important;margin:0!important;padding:5mm 10mm!important}.section-title{color:#176078!important}
`;
}
