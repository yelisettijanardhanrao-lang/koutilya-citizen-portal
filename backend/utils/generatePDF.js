const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const templatesDir = path.join(__dirname, "../templates");

function value(application, key) {
  const data = application.serviceData || {};
  const v = data[key];
  return v === undefined || v === null ? "" : String(v);
}

function draw(page, text, x, y, size = 9) {
  const v = text === undefined || text === null ? "" : String(text);
  if (!v.trim()) return;

  page.drawText(v, {
    x,
    y,
    size,
    color: rgb(0, 0, 0),
  });
}

function template(name) {
  const p = path.join(templatesDir, name);
  if (!fs.existsSync(p)) {
    throw new Error(`PDF template not found: ${p}`);
  }
  return p;
}

async function loadTemplate(name) {
  return PDFDocument.load(fs.readFileSync(template(name)));
}

function currentAdangal(pdfDoc, application) {
  const page = pdfDoc.getPages()[0];

  draw(page, application.applicantName, 310, 611);
  draw(page, application.fatherName, 310, 590);
  draw(page, application.house, 312, 568);
  draw(page, application.street, 309, 546);
  draw(page, application.village, 312, 519);
  draw(page, application.mandal, 310, 499);
  draw(page, application.ration, 313, 477);
  draw(page, application.aadhaar, 310, 459);

  return pdfDoc;
}

function incomeCertificate(pdfDoc, application) {
  const page = pdfDoc.getPages()[0];

  const data = application.serviceData || {};

  const value = (key) => {
    const v = data[key];

    if (
      v === undefined ||
      v === null
    ) {
      return "";
    }

    return String(v);
  };

  const write = (
    text,
    x,
    y,
    size = 9
  ) => {
    const valueText =
      text === undefined ||
      text === null
        ? ""
        : String(text);

    if (!valueText.trim()) {
      return;
    }

    page.drawText(
      valueText,
      {
        x,
        y,
        size,
        color: rgb(0, 0, 0),
      }
    );
  };

  // =====================================================
  // INCOME CERTIFICATE
  // EXACT USER-SUPPLIED COORDINATES
  // =====================================================

 write(value("applicantName"), 118, 639);
write(value("fatherName"), 314, 640);
write(value("mandal"), 230, 620);
write(value("village"), 446, 620);
write(value("houseNumber"), 268, 601);
write(value("rationCardNumber"), 220, 580);
write(value("yearIncome"), 400, 561);
write(value("yearIncomeWords"), 173, 542);
write(value("applicationPurpose"), 165, 521);
write(value("gender"), 151, 477);
write(value("dateOfBirth"), 275, 477);
write(value("landmark"), 425, 477);
write(value("district"), 138, 455);
write(value("pincode"), 269, 455);
write(value("landsBuildingsIncome"), 379, 421);
write(value("whichBusiness"), 121, 402);
write(value("businessIncome"), 381, 400);
write(value("wifeHusbandIncome"), 381, 380);
write(value("onDailyWageBasis"), 125, 364);
write(value("dailyWageIncome"), 381, 359);
write(value("otherIncomeSource"), 381, 340);
write(value("total"), 381, 302);

  /*
   * IMPORTANT:
   *
   * Mobile number is stored in:
   * application.mobile
   * and serviceData.mobile
   *
   * BUT IT IS INTENTIONALLY NOT PRINTED.
   */

  return pdfDoc;
}

function casteIntegrated(pdfDoc, application) {
  const page = pdfDoc.getPages()[0];

  // ==========================================================
  // CASTE & INTEGRATED CERTIFICATE
  // EXACT USER-SUPPLIED COORDINATES
  // ==========================================================

  const data =
    application?.serviceData || {};

  const value = (key) => {
    const v = data[key];

    if (
      v === undefined ||
      v === null
    ) {
      return "";
    }

    return String(v);
  };

  const write = (
    key,
    x,
    y,
    size = 9
  ) => {
    const text = value(key);

    if (!text.trim()) {
      return;
    }

    page.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  };

  // ==========================================================
  // PAGE 1
  // ==========================================================

  // 1. Mandal / Division
  write(
    "mandalDivision",
    205,
    647
  );

  // 2. District
  write(
    "district",
    18,
    628
  );

  // 3. Applicant Name
  write(
    "applicantName",
    300,
    530
  );

  // 4. Gender
  write(
    "gender",
    300,
    506
  );

  // 5. Father Name
  write(
    "fatherName",
    300,
    481
  );

  // 6. Mother Name
  write(
    "motherName",
    300,
    455
  );

  // 7. Present Address
  write(
    "presentAddress",
    300,
    427
  );

  // ==========================================================
  // 8. PERMANENT ADDRESS
  // ==========================================================

  write(
    "permanentAddressLine1",
    300,
    375
  );

  write(
    "permanentAddressLine2",
    300,
    349
  );

  write(
    "permanentAddressLine3",
    300,
    324
  );

  write(
    "permanentAddressLine4",
    300,
    300
  );

  // ==========================================================
  // 9. DATE OF BIRTH / AGE / PLACE OF BIRTH
  // ==========================================================

  write(
    "birthAgePlace",
    300,
    251
  );

  // ==========================================================
  // 10. ORDINARY PLACE OF RESIDENCE
  // ==========================================================

  write(
    "ordinaryResidenceLine1",
    300,
    175
  );

  write(
    "ordinaryResidenceLine2",
    300,
    150
  );

  write(
    "ordinaryResidenceLine3",
    300,
    122
  );

  // ==========================================================
  // PAGE 2
  // ==========================================================

  const pages =
    pdfDoc.getPages();

  const page2 =
    pages[1];

  if (!page2) {
    throw new Error(
      "Caste & Integrated Certificate PDF must contain 2 pages."
    );
  }

  // ----------------------------------------------------------
  // 11. PREVIOUS CASTE CERTIFICATE
  // ----------------------------------------------------------

  const writePage2 = (
    key,
    x,
    y,
    size = 9
  ) => {
    const text = value(key);

    if (!text.trim()) {
      return;
    }

    page2.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  };

  writePage2(
    "previousCasteCertificate",
    347,
    771
  );

  // ==========================================================
  // 12. CASTE DETAILS
  // ==========================================================

  writePage2(
    "casteDetailsLine1",
    347,
    701
  );

  writePage2(
    "casteDetailsLine2",
    347,
    678
  );

  // ==========================================================
  // 13. FATHER'S CASTE
  // ==========================================================

  writePage2(
    "fatherCaste",
    347,
    605
  );

  // ==========================================================
  // 14. MOTHER'S CASTE
  // ==========================================================

  writePage2(
    "motherCaste",
    347,
    556
  );

  // ==========================================================
  // 15. APPLICANT RELIGION
  // ==========================================================

  writePage2(
    "applicantReligion",
    347,
    533
  );

  // ==========================================================
  // 16. FATHER RELIGION
  // ==========================================================

  writePage2(
    "fatherReligion",
    347,
    507
  );

  // ==========================================================
  // 17. MOTHER RELIGION
  // ==========================================================

  writePage2(
    "motherReligion",
    347,
    483
  );

  // ==========================================================
  // 18. NATURAL / ADOPTED
  // ==========================================================

  writePage2(
    "naturalOrAdopted",
    347,
    434
  );

  // ==========================================================
  // MOBILE
  // ==========================================================
  // Mobile is database-only.
  // DO NOT PRINT mobile.

  return pdfDoc;
}

function birthCertificate(pdfDoc, application) {
  const p = pdfDoc.getPages()[0];

  const fields = [
    ["division", 117, 808],
    ["district", 118, 795],
    ["subjectApplicant", 137, 719],
    ["subjectRelation", 391, 721],
    ["age", 121, 702],
    ["occupation", 250, 703],
    ["houseNo", 376, 703],
    ["near", 448, 703],
    ["mandal", 89, 682],
    ["district2", 202, 683],
    ["wifeName", 228, 632],
    ["wifeAge", 358, 632],
    ["childName", 92, 612],
    ["birthDate", 267, 612],
    ["birthPlace", 418, 611],
    ["birthHouseNo", 122, 594],
    ["birthNear", 198, 593],
    ["birthMandal", 251, 593],
    ["birthDistrict", 420, 592],
    ["registrationMandal", 315, 554],
    ["registerMandal", 94, 517],
    ["municipalCouncil", 127, 391],
  ];

  for (const [key, x, y] of fields) {
    draw(p, value(application, key), x, y);
  }

  return pdfDoc;
}

function deathCertificate(pdfDoc, application) {
  const p = pdfDoc.getPages()[0];

  const fields = [
    ["division", 40, 822],
    ["district", 39, 810],
    ["subjectRelation", 353, 758],
    ["applicantName", 85, 733],
    ["applicantRelation", 375, 734],
    ["age", 64, 714],
    ["occupation", 191, 714],
    ["houseNo", 311, 714],
    ["near", 380, 714],
    ["mandal", 461, 714],
    ["district2", 37, 693],
    ["deceasedRelation", 114, 644],
    ["deceasedName", 304, 645],
    ["deceasedAge", 443, 645],
    ["deathDate", 51, 624],
    ["deathHouseNo", 269, 625],
    ["deathNear", 384, 625],
    ["deathMandal", 35, 608],
    ["deathDistrict", 247, 607],
    ["registrationRelation", 107, 589],
    ["deceasedNameRegister", 389, 570],
    ["registrationMandal", 39, 568],
    ["birthDeathRegisterMandal", 155, 550],
    ["purpose", 273, 518],
    ["municipalCouncil", 75, 424],
    ["deceasedName2", 309, 424],
  ];

  for (const [key, x, y] of fields) {
    draw(p, value(application, key), x, y);
  }

  return pdfDoc;
}

function ewsCertificate(pdfDoc, application) {
  const p = pdfDoc.getPages()[0];

  const fields = [
    ["financialYear", 353, 697],
    ["applicantName", 187, 643],
    ["fatherName", 426, 643],
    ["gender", 145, 618],
    ["dateOfBirth", 415, 617],
    ["aadhaar", 238, 594],
    ["casteCategory", 185, 566],
    ["subCasteCategory", 447, 567],
    ["presentDoorNo", 147, 512],
    ["presentLocality", 429, 512],
    ["state", 132, 485],
    ["district", 139, 461],
    ["mandal", 245, 460],
    ["village", 359, 460],
    ["pincode", 473, 459],
    ["postalDoorNo", 145, 411],
    ["postalLocality", 427, 412],
    ["postalState", 130, 384],
    ["postalDistrict", 137, 359],
    ["postalMandal", 241, 359],
    ["postalVillage", 354, 359],
    ["postalPincode", 468, 360],
    ["mobile", 179, 335],
    ["mailId", 367, 333],
    ["rationCard", 203, 308],
    ["grossAnnualIncome", 141, 227],
  ];

  for (const [key, x, y] of fields) {
    draw(p, value(application, key), x, y);
  }

  return pdfDoc;
}

function familyMemberCertificate(pdfDoc, application) {
  const pages = pdfDoc.getPages();
  const p1 = pages[0];
  const p2 = pages[1];

  const page1 = [
    ["aadhaar", 191, 606],
    ["applicantName", 163, 584],
    ["relationName", 386, 584],
    ["dateOfBirth", 372, 564],

    ["permanentDoorNo", 125, 518],
    ["permanentLocality", 381, 519],
    ["permanentDistrict", 119, 494],
    ["permanentMandal", 326, 495],
    ["permanentVillageWard", 149, 474],
    ["permanentPincode", 352, 474],

    ["presentDoorNo", 124, 430],
    ["presentLocality", 381, 430],
    ["presentState", 110, 408],
    ["presentDistrict", 263, 408],
    ["presentMandal", 404, 408],
    ["presentVillageWard", 147, 386],
    ["presentPincode", 437, 386],

    ["mobile", 131, 364],
    ["remarks", 337, 320],

    ["deceasedName", 161, 274],
    ["deceasedFatherHusbandName", 390, 273],
    ["deathDate", 225, 254],

    ["deceasedAadhaar", 181, 127],
    ["deathPlace", 363, 128],
    ["aadhaarEnrolmentNumber", 365, 107],
  ];

  for (const [key, x, y] of page1) {
    draw(p1, value(application, key), x, y);
  }

  const rows = [
    [76, 661, 199, 662, 241, 663, 295, 663, 389, 662, 479, 659],
    [79, 620, 201, 621, 242, 620, 293, 620, 386, 619, 478, 619],
    [75, 572, 196, 569, 239, 569, 293, 568, 388, 567, 477, 567],
    [75, 527, 197, 523, 240, 522, 293, 522, 386, 522, 477, 525],
  ];

  rows.forEach((r, i) => {
    const n = i + 1;
    draw(p2, value(application, `member${n}Name`), r[0], r[1]);
    draw(p2, value(application, `member${n}Age`), r[2], r[3]);
    draw(p2, value(application, `member${n}Gender`), r[4], r[5]);
    draw(p2, value(application, `member${n}Relationship`), r[6], r[7]);
    draw(p2, value(application, `member${n}MaritalStatus`), r[8], r[9]);
    draw(p2, value(application, `member${n}Aadhaar`), r[10], r[11]);
  });

  return pdfDoc;
}
function casteIntegratedCertificate(pdfDoc, application) {
  const page = pdfDoc.getPages()[0];

  const data =
    application.serviceData || {};

  const value = (key) => {
    const v = data[key];

    if (
      v === undefined ||
      v === null
    ) {
      return "";
    }

    return String(v);
  };

  const write = (
    text,
    x,
    y,
    size = 9
  ) => {
    if (
      text === undefined ||
      text === null ||
      !String(text).trim()
    ) {
      return;
    }

    page.drawText(
      String(text),
      {
        x,
        y,
        size,
        color: rgb(0, 0, 0),
      }
    );
  };

  // 1
  write(
    value("mandalDivision"),
    205,
    647
  );

  // 2
  write(
    value("district"),
    18,
    628
  );

  // 3
  write(
    value("applicantName"),
    300,
    530
  );

  // 4
  write(
    value("gender"),
    300,
    506
  );

  // 5
  write(
    value("fatherName"),
    300,
    481
  );

  // 6
  write(
    value("motherName"),
    300,
    455
  );

  // 7
  write(
    value("presentAddress"),
    300,
    427
  );

  // 8 - Permanent Address
  write(
    value("permanentAddressLine1"),
    300,
    375
  );

  write(
    value("permanentAddressLine2"),
    300,
    349
  );

  write(
    value("permanentAddressLine3"),
    300,
    324
  );

  write(
    value("permanentAddressLine4"),
    300,
    300
  );

  // 9
  write(
    value("birthAgePlace"),
    300,
    251
  );

  // 10 - Ordinary Residence
  write(
    value("ordinaryResidenceLine1"),
    300,
    175
  );

  write(
    value("ordinaryResidenceLine2"),
    300,
    150
  );

  write(
    value("ordinaryResidenceLine3"),
    300,
    122
  );

  // 11
  write(
    value("previousCasteCertificate"),
    347,
    771
  );

  // 12
  write(
    value("casteDetailsLine1"),
    347,
    701
  );

  write(
    value("casteDetailsLine2"),
    347,
    678
  );

  // 13
  write(
    value("fatherCaste"),
    347,
    605
  );

  // 14
  write(
    value("motherCaste"),
    347,
    556
  );

  // 15
  write(
    value("applicantReligion"),
    347,
    533
  );

  // 16
  write(
    value("fatherReligion"),
    347,
    507
  );

  // 17
  write(
    value("motherReligion"),
    347,
    483
  );

  // 18
  write(
    value("naturalOrAdopted"),
    347,
    434
  );

  // IMPORTANT:
  // Mobile is database-only.
  // DO NOT PRINT mobile.

  return pdfDoc;
}
function obcCertificate(pdfDoc, application) {
  const pages = pdfDoc.getPages();

  const p1 = pages[0];
  const p2 = pages[1];
  const p3 = pages[2];

  const page1 = [
    ["applicantName", 375, 733],
    ["gender", 374, 718],
    ["dateOfBirth", 375, 700],
    ["completeResidentAddress", 375, 685],

    ["permanentDoorNo", 208, 656],
    ["permanentLocality", 328, 657],
    ["permanentVillage", 446, 657],
    ["permanentMandal", 208, 641],
    ["permanentDistrict", 329, 642],
    ["permanentPincode", 447, 642],

    ["presentDoorNo", 203, 598],
    ["presentMandal", 203, 582],
    ["presentLocality", 327, 598],
    ["presentDistrict", 327, 582],
    ["presentVillage", 445, 598],
    ["presentPincode", 444, 582],

    ["religion", 374, 553],
    ["caste", 374, 538],
    ["subCaste", 373, 522],
    ["occupationGroup", 374, 478],
    ["centralOBCSerialNumber", 373, 446],
    ["fatherName", 373, 432],
    ["motherName", 374, 418],
    ["husbandName", 374, 403],

    ["constitutionalPosts", 374, 360],
    ["designation", 374, 344],
    ["serviceCentralState", 375, 328],
    ["serviceDesignation", 375, 314],
    ["scaleOfPay", 375, 300],
    ["clarification", 375, 284],
    ["appointmentDate", 374, 270],
    ["ageAtPromotion", 375, 254],
    ["classIPostAge", 375, 238],

    ["internationalOrganization", 375, 195],
    ["internationalDesignation", 373, 180],
  ];

  for (const [key, x, y] of page1) {
    draw(p1, value(application, key), x, y);
  }

  const page2 = [
    ["deathOrIncapacitationDate", 374, 934],
    ["incapacitationDetails", 374, 905],
    ["publicSectorOrganization", 375, 831],
    ["publicSectorDesignation", 374, 815],
    ["publicSectorAppointmentDate", 375, 799],
    ["armedForcesDesignation", 375, 726],
    ["armedForcesScaleOfPay", 375, 711],
    ["professionalOccupation", 373, 621],
    ["agriculturalLandHolding", 376, 531],
    ["landLocation", 375, 516],
    ["landSize", 375, 500],
    ["irrigatedPercentage", 374, 367],
    ["convertedIrrigatedHolding", 375, 307],
    ["totalIrrigatedPercentage", 374, 262],
    ["plantationCrops", 375, 158],
    ["plantationLocation", 375, 142],
    ["plantationArea", 375, 128],
  ];

  for (const [key, x, y] of page2) {
    draw(p2, value(application, key), x, y);
  }

  const page3 = [
    ["propertyLocation", 374, 905],
    ["propertyDetails", 374, 890],
    ["propertyUse", 375, 875],
    ["annualFamilyIncome", 375, 771],
    ["taxPaid", 375, 697],
    ["wealthTaxDetails", 374, 666],
    ["wealthTaxAdditionalDetails", 375, 652],
    ["familyMembers", 376, 636],
    ["purposeOfCasteCertificate", 375, 621],
    ["rationCardNumber", 377, 606],
  ];

  for (const [key, x, y] of page3) {
    draw(p3, value(application, key), x, y);
  }

  return pdfDoc;
}

async function panApplication(pdfDoc, application) {
  const pages = pdfDoc.getPages();
  if (pages.length < 2) throw new Error("PAN Form 49A PDF must contain 2 pages.");

  const p1 = pages[0];
  const p2 = pages[1];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const data = application?.serviceData || {};

  const get = (key) => {
    const v = data[key];
    return v === undefined || v === null ? "" : String(v).trim();
  };

  // Original supplied Form 49A geometry.
  // Section 1 character boxes:
  // left edge = 170.5 pt, cell width = 14.2 pt.
  // PAN names are written ONLY into their character boxes.
  const CELL = 14.52;
  const FONT_SIZE = 7.2;

  function boxText(page, key, x, y, count = 25, cellW = CELL) {
    const text = get(key).toUpperCase();
    if (!text) return;

    Array.from(text).slice(0, count).forEach((ch, i) => {
      if (ch === " ") return;
      const w = font.widthOfTextAtSize(ch, FONT_SIZE);
      page.drawText(ch, {
        x: x + i * cellW + (cellW - w) / 2,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
    });
  }

  function plain(page, key, x, y, size = 7.2) {
    const text = get(key);
    if (!text) return;
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  }

  function mark(page, key, options, size = 8) {
    const text = get(key).toLowerCase();
    if (!text) return;
    const hit = options.find(o =>
      o.values.some(v => text === v || text.includes(v))
    );
    if (!hit) return;

    // ASCII X: avoids WinAnsi encoding error for ✓.
    page.drawText("X", {
      x: hit.x, y: hit.y, size, font, color: rgb(0, 0, 0)
    });
  }

  function dateBoxes(page, rawValue, xDay, xMonth, xYear, y) {
    const raw = String(rawValue || "").trim();
    if (!raw) return;

    const parts = raw.split(/[-/]/);
    let day = "", month = "", year = "";

    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        year = parts[0]; month = parts[1]; day = parts[2];
      } else {
        day = parts[0]; month = parts[1]; year = parts[2];
      }
    }

    const put = (txt, x, count) => {
      Array.from(txt).slice(0, count).forEach((ch, i) => {
        const w = font.widthOfTextAtSize(ch, FONT_SIZE);
        page.drawText(ch, {
          x: x + i * CELL + (CELL - w) / 2,
          y, size: FONT_SIZE, font, color: rgb(0, 0, 0)
        });
      });
    };

    put(day, xDay, 2);
    put(month, xMonth, 2);
    put(year, xYear, 4);
  }

  // ==========================================================
  // PAGE 1 — ORIGINAL FORM 49A
  // ==========================================================

  mark(p1, "title", [
    { values: ["shri"], x: 191, y: 617 },
    { values: ["smt"], x: 251, y: 617 },
    { values: ["kumari"], x: 302, y: 617 },
    { values: ["m/s", "ms"], x: 358, y: 617 },
  ]);

  // EXACT SECTION-1 CHARACTER ROWS
  boxText(p1, "surname",   193.3, 604, 25);
  boxText(p1, "firstName", 193.3, 589, 25);
  boxText(p1, "middleName",193.3, 574, 25);

  // PAN print name.
  boxText(p1, "panPrintName", 44, 548, 35);

  // Other name.
  mark(p1, "otherNameYesNo", [
    { values: ["yes"], x: 248, y: 512 },
    { values: ["no"], x: 305, y: 512 },
  ]);

  mark(p1, "otherTitle", [
    { values: ["shri"], x: 191, y: 486 },
    { values: ["smt"], x: 251, y: 486 },
    { values: ["kumari"], x: 302, y: 486 },
    { values: ["m/s", "ms"], x: 358, y: 486 },
  ]);

  boxText(p1, "otherSurname",    193.3, 461, 25);
  boxText(p1, "otherFirstName",  193.3, 446, 25);
  boxText(p1, "otherMiddleName", 193.3, 431, 25);

  // Gender.
  mark(p1, "gender", [
    { values: ["male"], x: 210, y: 406 },
    { values: ["female"], x: 265, y: 406 },
    { values: ["transgender"], x: 329, y: 406 },
  ]);

  // DOB.
  dateBoxes(p1, get("dob"), 45, 88, 129, 369);

  // Parents.
  mark(p1, "motherSingleParent", [
    { values: ["yes"], x: 48, y: 335 },
    { values: ["no"], x: 101, y: 335 },
  ]);

  boxText(p1, "fatherSurname",    170.5, 289, 25);
  boxText(p1, "fatherFirstName",  170.5, 274, 25);
  boxText(p1, "fatherMiddleName", 170.5, 259, 25);

  boxText(p1, "motherSurname",    170.5, 224, 25);
  boxText(p1, "motherFirstName",  170.5, 209, 25);
  boxText(p1, "motherMiddleName", 170.5, 194, 25);

  mark(p1, "panParentChoice", [
    { values: ["father"], x: 48, y: 163 },
    { values: ["mother"], x: 136, y: 163 },
  ]);

  // Residence.
  boxText(p1, "residenceDoorNo",   170.5, 125, 25);
  boxText(p1, "residencePremises", 170.5, 110, 25);
  boxText(p1, "residenceRoad",     170.5, 95, 25);
  boxText(p1, "residenceArea",     170.5, 80, 25);
  boxText(p1, "residenceTown",     170.5, 65, 25);

  plain(p1, "residenceState", 44, 43, 7);
  boxText(p1, "residencePincode", 244, 43, 6);
  plain(p1, "residenceCountry", 348, 43, 7);

  // ==========================================================
  // PAGE 2
  // ==========================================================

  boxText(p2, "officeDoorNo",   170.5, 795, 25);
  boxText(p2, "officePremises", 170.5, 780, 25);
  boxText(p2, "officeRoad",     170.5, 765, 25);
  boxText(p2, "officeArea",     170.5, 750, 25);
  boxText(p2, "officeTown",     170.5, 735, 25);

  plain(p2, "officeState", 44, 710, 7);
  boxText(p2, "officePincode", 244, 710, 6);
  plain(p2, "officeCountry", 348, 710, 7);

  mark(p2, "communicationAddress", [
    { values: ["residence"], x: 211, y: 686 },
    { values: ["office"], x: 309, y: 686 },
  ]);

  boxText(p2, "telephoneCountryCode", 73, 658, 3);
  boxText(p2, "telephoneStdCode", 121, 658, 7);
  boxText(p2, "telephoneMobile", 221, 658, 18);
  plain(p2, "email", 73, 636, 7);

  mark(p2, "applicantStatus", [
    { values: ["individual"], x: 46, y: 599 },
    { values: ["huf"], x: 122, y: 599 },
    { values: ["company"], x: 219, y: 599 },
    { values: ["partnership"], x: 320, y: 599 },
    { values: ["government"], x: 440, y: 617 },
    { values: ["association"], x: 440, y: 599 },
    { values: ["trust"], x: 46, y: 576 },
    { values: ["body"], x: 122, y: 576 },
    { values: ["local"], x: 219, y: 576 },
    { values: ["artificial"], x: 320, y: 576 },
    { values: ["llp"], x: 440, y: 576 },
  ]);

  boxText(p2, "registrationNumber", 44, 540, 35);
  boxText(p2, "aadhaar", 201, 504, 12);
  boxText(p2, "aadhaarEnrolmentId", 170.5, 479, 25);
  boxText(p2, "aadhaarName", 170.5, 454, 25);

  mark(p2, "sourceSalary", [{ values: ["yes"], x: 31, y: 407 }]);
  mark(p2, "sourceBusiness", [{ values: ["yes"], x: 31, y: 384 }]);
  mark(p2, "sourceHouseProperty", [{ values: ["yes"], x: 31, y: 361 }]);
  mark(p2, "sourceCapitalGains", [{ values: ["yes"], x: 441, y: 407 }]);
  mark(p2, "sourceOther", [{ values: ["yes"], x: 441, y: 384 }]);
  mark(p2, "sourceNoIncome", [{ values: ["yes"], x: 441, y: 361 }]);

  boxText(p2, "businessCode", 289, 386, 2);

  mark(p2, "raTitle", [
    { values: ["shri"], x: 191, y: 292 },
    { values: ["smt"], x: 251, y: 292 },
    { values: ["kumari"], x: 302, y: 292 },
    { values: ["m/s", "ms"], x: 358, y: 292 },
  ]);

  boxText(p2, "raSurname",    170.5, 279, 25);
  boxText(p2, "raFirstName",  170.5, 264, 25);
  boxText(p2, "raMiddleName", 170.5, 249, 25);

  boxText(p2, "raAddressDoorNo", 170.5, 224, 25);
  boxText(p2, "raPremises",      170.5, 209, 25);
  boxText(p2, "raRoad",          170.5, 194, 25);
  boxText(p2, "raArea",          170.5, 179, 25);
  boxText(p2, "raTown",          170.5, 164, 25);

  plain(p2, "proofIdentity", 98, 105, 7);
  plain(p2, "proofAddress", 133, 93, 7);
  plain(p2, "proofDob", 297, 93, 7);
  plain(p2, "declarationCapacity", 380, 65, 7);
  plain(p2, "place", 45, 42, 7);

  return pdfDoc;
}

function obcCertificate(pdfDoc, application) {
  const pages = pdfDoc.getPages();

  if (pages.length < 3) {
    throw new Error("OBC Certificate PDF must contain 3 pages.");
  }

  const p1 = pages[0];
  const p2 = pages[1];
  const p3 = pages[2];

  const page1 = [
    ["applicantName", 375, 733],
    ["gender", 374, 718],
    ["dateOfBirth", 375, 700],
    ["completeResidentAddress", 375, 685],

    ["permanentDoorNo", 208, 656],
    ["permanentLocality", 328, 657],
    ["permanentVillage", 446, 657],
    ["permanentMandal", 208, 641],
    ["permanentDistrict", 329, 642],
    ["permanentPincode", 447, 642],

    ["presentDoorNo", 203, 598],
    ["presentMandal", 203, 582],
    ["presentLocality", 327, 598],
    ["presentDistrict", 327, 582],
    ["presentVillage", 445, 598],
    ["presentPincode", 444, 582],

    ["religion", 374, 553],
    ["caste", 374, 538],
    ["subCaste", 373, 522],
    ["occupationGroup", 374, 478],
    ["centralOBCSerialNumber", 373, 446],
    ["fatherName", 373, 432],
    ["motherName", 374, 418],
    ["husbandName", 374, 403],

    ["constitutionalPosts", 374, 360],
    ["designation", 374, 344],
    ["serviceCentralState", 375, 328],
    ["serviceDesignation", 375, 314],
    ["scaleOfPay", 375, 300],
    ["clarification", 375, 284],
    ["appointmentDate", 374, 270],
    ["ageAtPromotion", 375, 254],
    ["classIPostAge", 375, 238],

    ["internationalOrganization", 375, 195],
    ["internationalDesignation", 373, 180],
  ];

  for (const [key, x, y] of page1) {
    draw(p1, value(application, key), x, y);
  }

  const page2 = [
    ["deathOrIncapacitationDate", 374, 934],
    ["incapacitationDetails", 374, 905],
    ["publicSectorOrganization", 375, 831],
    ["publicSectorDesignation", 374, 815],
    ["publicSectorAppointmentDate", 375, 799],
    ["armedForcesDesignation", 375, 726],
    ["armedForcesScaleOfPay", 375, 711],
    ["professionalOccupation", 373, 621],
    ["agriculturalLandHolding", 376, 531],
    ["landLocation", 375, 516],
    ["landSize", 375, 500],
    ["irrigatedPercentage", 374, 367],
    ["convertedIrrigatedHolding", 375, 307],
    ["totalIrrigatedPercentage", 374, 262],
    ["plantationCrops", 375, 158],
    ["plantationLocation", 375, 142],
    ["plantationArea", 375, 128],
  ];

  for (const [key, x, y] of page2) {
    draw(p2, value(application, key), x, y);
  }

  const page3 = [
    ["propertyLocation", 374, 905],
    ["propertyDetails", 374, 890],
    ["propertyUse", 375, 875],
    ["annualFamilyIncome", 375, 771],
    ["taxPaid", 375, 697],
    ["wealthTaxDetails", 374, 666],
    ["wealthTaxAdditionalDetails", 375, 652],
    ["familyMembers", 376, 636],
    ["purposeOfCasteCertificate", 375, 621],
    ["rationCardNumber", 377, 606],
  ];

  for (const [key, x, y] of page3) {
    draw(p3, value(application, key), x, y);
  }

  return pdfDoc;
}

async function generatePDF(application) {
  let pdfDoc;

  switch (application.service) {
    case "Current Adangal":
      pdfDoc = await loadTemplate("current-adangal.pdf");
      currentAdangal(pdfDoc, application);
      break;

    case "Income Certificate":
      pdfDoc = await loadTemplate("income-certificate.pdf");
      incomeCertificate(pdfDoc, application);
      break;

    case "Caste & Integrated Certificate":
      pdfDoc = await loadTemplate("caste-integrated.pdf");
      casteIntegrated(pdfDoc, application);
      break;

    case "Late Registration of Birth Certificate":
      pdfDoc = await loadTemplate("birth-certificate.pdf");
      birthCertificate(pdfDoc, application);
      break;

    case "Late Registration of Death Certificate":
      pdfDoc = await loadTemplate("death-certificate.pdf");
      deathCertificate(pdfDoc, application);
      break;

    case "EWS Income & Asset Certificate":
      pdfDoc = await loadTemplate("ews-certificate.pdf");
      ewsCertificate(pdfDoc, application);
      break;

    case "Family Member Certificate":
      pdfDoc = await loadTemplate("family-member-certificate.pdf");
      familyMemberCertificate(pdfDoc, application);
      break;

    case "OBC Certificate":
      pdfDoc = await loadTemplate("obc-certificate.pdf");
      obcCertificate(pdfDoc, application);
      break;

    default:
      throw new Error(`Unsupported service: ${application.service}`);
  }

  const dir = path.join(__dirname, "../uploads/pdfs");
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${application.applicationNumber}.pdf`;
  const output = path.join(dir, filename);

  fs.writeFileSync(output, await pdfDoc.save());

  return `/uploads/pdfs/${filename}`;
}

module.exports = generatePDF;
