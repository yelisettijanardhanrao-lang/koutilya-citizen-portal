const form = document.getElementById('appForm');
const status = document.getElementById('status');


/* =====================================================
   AUTO TITLE CASE
   ===================================================== */

function titleCase(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}

document
  .querySelectorAll('input[type="text"], textarea')
  .forEach(el => {

    el.addEventListener('blur', () => {

      if (
        !el.name.toLowerCase().includes('email') &&
        !el.name.toLowerCase().includes('aadhaar') &&
        !el.name.toLowerCase().includes('pincode')
      ) {
        el.value = titleCase(el.value);
      }

    });

  });


/* =====================================================
   AP DISTRICT / MANDAL / VILLAGE DATA
   ===================================================== */

let apLocationData = {};


/* =====================================================
   CSV PARSER
   ===================================================== */

function parseCSVLine(line) {

  const result = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {

    const ch = line[i];

    if (ch === '"') {

      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }

    }

    else if (ch === ',' && !quoted) {

      result.push(value.trim());
      value = '';

    }

    else {

      value += ch;

    }

  }

  result.push(value.trim());

  return result;
}


/* =====================================================
   LOAD CSV
   ===================================================== */

async function loadAPLocations() {

  console.log(
    'Loading AP District / Mandal / Village data...'
  );

  try {

    const response = await fetch(
      '/locations.csv',
      {
        cache: 'no-store'
      }
    );


    if (!response.ok) {

      throw new Error(
        `locations.csv not found. HTTP ${response.status}`
      );

    }


    const csvText =
      await response.text();


    if (!csvText.trim()) {

      throw new Error(
        'locations.csv is empty.'
      );

    }


    const lines =
      csvText
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter(line => line.trim());


    const headers =
      parseCSVLine(lines[0])
        .map(h =>
          h
            .replace(/^"|"$/g, '')
            .trim()
            .toLowerCase()
        );


    console.log(
      'CSV headers:',
      headers
    );


    const districtIndex =
      headers.indexOf('district');

    const mandalIndex =
      headers.indexOf('mandal');

    const villageIndex =
      headers.indexOf('village');

    const nativeVillageIndex =
      headers.indexOf('village (native)');

    const pincodeIndex =
      headers.indexOf('pincode');


    if (
      districtIndex === -1 ||
      mandalIndex === -1 ||
      villageIndex === -1
    ) {

      throw new Error(
        'District / Mandal / Village columns not found in locations.csv'
      );

    }


    apLocationData = {};


    for (
      let i = 1;
      i < lines.length;
      i++
    ) {

      const row =
        parseCSVLine(lines[i]);


      const district =
        (row[districtIndex] || '').trim();

      const mandal =
        (row[mandalIndex] || '').trim();

      const village =
        (row[villageIndex] || '').trim();

      const nativeVillage =
        nativeVillageIndex >= 0
          ? (row[nativeVillageIndex] || '').trim()
          : '';

      const pincode =
        pincodeIndex >= 0
          ? (row[pincodeIndex] || '').trim()
          : '';


      if (
        !district ||
        !mandal ||
        !village
      ) {
        continue;
      }


      if (!apLocationData[district]) {

        apLocationData[district] = {};

      }


      if (
        !apLocationData[district][mandal]
      ) {

        apLocationData[district][mandal] = {};

      }


      apLocationData[district][mandal][village] = {

        nativeVillage:
          nativeVillage,

        pincode:
          pincode

      };

    }


    console.log(
      'Districts loaded:',
      Object.keys(apLocationData).length
    );


    populateAllDistricts();


  }

  catch (error) {

    console.error(
      'AP LOCATION DATA ERROR:',
      error
    );

  }

}


/* =====================================================
   FIND SELECT BY NAME
   ===================================================== */

function getField(name) {

  return document.querySelector(
    `select[name="${name}"], input[name="${name}"]`
  );

}


/* =====================================================
   POPULATE DISTRICT DROPDOWNS
   ===================================================== */

function populateAllDistricts() {

  const districtNames = [
    'permanentDistrict',
    'presentDistrict'
  ];


  districtNames.forEach(name => {

    const district =
      getField(name);


    if (!district) {

      console.error(
        'Cannot find:',
        name
      );

      return;

    }


    district.innerHTML =
      '<option value="">Select District / జిల్లా ఎంచుకోండి</option>';


    Object.keys(apLocationData)
      .sort((a, b) =>
        a.localeCompare(b)
      )
      .forEach(districtName => {

        const option =
          document.createElement('option');


        option.value =
          districtName;


        option.textContent =
          districtName;


        district.appendChild(option);

      });

  });


  setupLocation(
    'permanent'
  );


  setupLocation(
    'present'
  );

}


/* =====================================================
   DISTRICT → MANDAL → VILLAGE
   ===================================================== */

function setupLocation(type) {

  const district =
    getField(
      `${type}District`
    );

  const mandal =
    getField(
      `${type}Mandal`
    );

  const village =
    getField(
      `${type}Village`
    );

  const pincode =
    getField(
      `${type}Pincode`
    );


  if (
    !district ||
    !mandal ||
    !village
  ) {

    console.error(
      'Location fields missing for:',
      type
    );

    return;

  }


  /* =================================================
     DISTRICT CHANGE
     ================================================= */

  district.addEventListener(
    'change',
    function () {

      mandal.innerHTML =
        '<option value="">Select Mandal / మండలం ఎంచుకోండి</option>';


      village.innerHTML =
        '<option value="">Select Village / గ్రామం ఎంచుకోండి</option>';


      if (pincode) {

        pincode.value = '';

      }


      const districtName =
        district.value;


      if (!districtName) {

        return;

      }


      const mandals =
        apLocationData[districtName] || {};


      Object.keys(mandals)
        .sort((a, b) =>
          a.localeCompare(b)
        )
        .forEach(mandalName => {

          const option =
            document.createElement('option');


          option.value =
            mandalName;


          option.textContent =
            mandalName;


          mandal.appendChild(option);

        });


      console.log(
        `${type} mandals loaded:`,
        Object.keys(mandals).length
      );

    }
  );


  /* =================================================
     MANDAL CHANGE
     ================================================= */

  mandal.addEventListener(
    'change',
    function () {

      village.innerHTML =
        '<option value="">Select Village / గ్రామం ఎంచుకోండి</option>';


      if (pincode) {

        pincode.value = '';

      }


      const districtName =
        district.value;

      const mandalName =
        mandal.value;


      if (
        !districtName ||
        !mandalName
      ) {

        return;

      }


      const villages =
        apLocationData[districtName]?.[mandalName] || {};


      Object.keys(villages)
        .sort((a, b) =>
          a.localeCompare(b)
        )
        .forEach(villageName => {

          const villageData =
            villages[villageName];


          const option =
            document.createElement('option');


          option.value =
            villageName;


          option.textContent =
            villageData.nativeVillage
              ? `${villageName} / ${villageData.nativeVillage}`
              : villageName;


          option.dataset.pincode =
            villageData.pincode || '';


          village.appendChild(option);

        });


      console.log(
        `${type} villages loaded:`,
        Object.keys(villages).length
      );

    }
  );


  /* =================================================
     VILLAGE → PINCODE
     ================================================= */

  village.addEventListener(
    'change',
    function () {

      const selected =
        village.options[
          village.selectedIndex
        ];


      if (
        pincode &&
        selected
      ) {

        pincode.value =
          selected.dataset.pincode || '';

      }

    }
  );

}


/* =====================================================
   START
   ===================================================== */

loadAPLocations();


/* =====================================================
   PDF DOWNLOAD
   ===================================================== */

form.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();


    const button =
      form.querySelector('button');


    button.disabled = true;


    status.className = '';


    status.textContent =
      'Generating PDF...';


    const raw =
      Object.fromEntries(
        new FormData(form)
      );


    const data = {};


    /* =================================================
       FIELD MAPPING
       ================================================= */

    const mapping = {

      applicantName:
        'applicant_name',

      gender:
        'gender',

      dateOfBirth:
        'date_of_birth',

      religion:
        'religion',

      caste:
        'caste',

      subCaste:
        'sub_caste',

      castePast:
        'caste_certificate_past',

      educationCaste:
        'education_certificate_caste',

      occupationGroup:
        'occupation_group',

      centralOBCSerial:
        'obc_serial_number',


      fatherName:
        'father_name',

      motherName:
        'mother_name',

      husbandName:
        'husband_name',

      parentStatus:
        'parent_husband_status',

      constitutionalPosts:
        'constitutional_posts',

      designation:
        'parent_designation',

      serviceType:
        'service_type',

      serviceDesignation:
        'service_designation',

      scalePay:
        'scale_of_pay',

      clarification:
        'clarification',

      appointmentDate:
        'appointment_date',

      promotionAge:
        'promotion_age',


      /* ---------- PERMANENT ADDRESS ---------- */

      permanentDoor:
        'permanent_door_no',

      permanentLocality:
        'permanent_locality',

      permanentVillage:
        'permanent_village',

      permanentMandal:
        'permanent_mandal',

      permanentDistrict:
        'permanent_district',

      permanentPincode:
        'permanent_pincode',


      /* ---------- PRESENT ADDRESS ---------- */

      presentDoor:
        'present_door_no',

      presentLocality:
        'present_locality',

      presentVillage:
        'present_village',

      presentMandal:
        'present_mandal',

      presentDistrict:
        'present_district',

      presentPincode:
        'present_pincode',


      /* ---------- INTERNATIONAL ORGANIZATION ---------- */

      intlOrg:
        'international_organization',

      intlDesignation:
        'international_designation',

      intlFrom:
        'international_from',

      intlTo:
        'international_to',


      /* ---------- DEATH / INCAPACITATION ---------- */

      incapDate:
        'death_incapacitation_date',

      incapDetails:
        'incapacitation_details',


      /* ---------- PUBLIC SECTOR ---------- */

      psuOrg:
        'public_sector_organization',

      psuDesignation:
        'public_sector_designation',

      psuAppointment:
        'public_sector_appointment_date',


      /* ---------- ARMED FORCES ---------- */

      armedDesignation:
        'armed_designation',

      armedScale:
        'armed_scale_pay',


      /* ---------- PROFESSIONAL ---------- */

      profession:
        'profession',


      /* ---------- AGRICULTURAL PROPERTY ---------- */

      agriLocation:
        'agri_location',

      agriSize:
        'holding_size',

      irrigated1:
        'irrigated_1',

      irrigated2:
        'irrigated_2',

      irrigated3:
        'irrigated_3',

      unirrigated:
        'unirrigated',

      irrigatedPercent:
        'irrigated_percentage',

      conversion:
        'conversion',

      conversionPercent:
        'conversion_percentage',


      /* ---------- PLANTATION ---------- */

      plantationCrops:
        'plantation_crops',

      plantationLocation:
        'plantation_location',

      plantationArea:
        'plantation_area',


      /* ---------- URBAN PROPERTY ---------- */

      urbanLocation:
        'urban_property_location',

      urbanDetails:
        'urban_property_details',

      urbanUse:
        'urban_property_use',


      /* ---------- INCOME / WEALTH ---------- */

      familyIncome:
        'family_income',

      taxPaid:
        'tax_paid',

      wealthTax:
        'wealth_tax',

      wealthDetails:
        'wealth_details',


      /* ---------- OTHER DETAILS ---------- */

      familyMembers:
        'family_members',

      purpose:
        'purpose',

      rationCard:
        'ration_card',

      aadhaar:
        'aadhaar',

      otherInfo:
        'other_information',


      /* ---------- FINAL DETAILS ---------- */

      place:
        'place',

      dated:
        'dated',


      /* ---------- CONTACT ---------- */

      mobile:
        'mobile',

      email:
        'email',

      landline:
        'landline'

    };


    /* =================================================
       CREATE DATA
       ================================================= */

    Object.entries(mapping)
      .forEach(([from, to]) => {

        data[to] =
          raw[from] || '';

      });


    /* =================================================
       ORIGINAL FORM DATA
       ================================================= */

    data.__checks = {};


    Object.keys(raw)
      .forEach(key => {

        data.__checks[key] =
          raw[key] || '';

      });


    /* =================================================
       GENERATE PDF
       ================================================= */

    try {

      const r =
        await fetch(
          '/api/pdf/obc',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(data)

          }
        );


      if (!r.ok) {

        const errorData =
          await r
            .json()
            .catch(() => ({}));


        throw new Error(
          errorData.message ||
          'PDF generation failed'
        );

      }


      const blob =
        await r.blob();


      const url =
        URL.createObjectURL(blob);


      const a =
        document.createElement('a');


      a.href = url;


      a.download =
        'OBC_Certificate_Application.pdf';


      document.body.appendChild(a);


      a.click();


      a.remove();


      setTimeout(
        () => {
          URL.revokeObjectURL(url);
        },
        1000
      );


      status.className =
        'success';


      status.textContent =
        'PDF downloaded successfully.';


    } catch (err) {

      console.error(
        'OBC PDF ERROR:',
        err
      );


      status.className =
        'error';


      status.textContent =
        err.message ||
        'PDF generation failed.';

    }


    finally {

      button.disabled = false;

    }

  }
);