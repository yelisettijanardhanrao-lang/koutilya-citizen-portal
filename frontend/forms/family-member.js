// =====================================================
// FAMILY MEMBER CERTIFICATE
// FINAL family-member.js
// =====================================================

const form = document.getElementById('appForm');
const status = document.getElementById('status');


// =====================================================
// TITLE CASE
// =====================================================

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}


// =====================================================
// AUTO TITLE CASE
// =====================================================

document
  .querySelectorAll('input[type="text"], textarea')
  .forEach(element => {

    element.addEventListener('blur', () => {

      const name =
        String(element.name || '').toLowerCase();

      if (
        !name.includes('email') &&
        !name.includes('aadhaar') &&
        !name.includes('pincode')
      ) {
        element.value =
          titleCase(element.value);
      }

    });

  });


// =====================================================
// LOCATION SELECT ELEMENTS
// =====================================================

// PERMANENT ADDRESS

const districtSelect =
  document.getElementById('district');

const mandalSelect =
  document.getElementById('mandal');

const villageSelect =
  document.getElementById('village');


// PRESENT ADDRESS

const presentDistrictSelect =
  document.getElementById('presentDistrict');

const presentMandalSelect =
  document.getElementById('presentMandal');

const presentVillageSelect =
  document.getElementById('presentVillage');


// =====================================================
// LOCATION DATA
// =====================================================

let locations = [];


// =====================================================
// CSV PARSER
// Unique function name
// Prevents duplicate parseCSVLine errors
// =====================================================

function parseFamilyCSVLine(line) {

  const result = [];

  let current = '';

  let insideQuotes = false;


  for (let i = 0; i < line.length; i++) {

    const char = line[i];


    if (char === '"') {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        insideQuotes =
          !insideQuotes;

      }

    }

    else if (
      char === ',' &&
      !insideQuotes
    ) {

      result.push(
        current.trim()
      );

      current = '';

    }

    else {

      current += char;

    }

  }


  result.push(
    current.trim()
  );


  return result;
}


// =====================================================
// NORMALIZE LOCATION VALUE
// =====================================================

function normalizeLocation(value) {

  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

}


// =====================================================
// RESET SELECT
// =====================================================

function resetSelect(
  select,
  placeholder,
  disabled = true
) {

  if (!select) {
    return;
  }


  select.innerHTML = '';


  const option =
    document.createElement('option');


  option.value = '';

  option.textContent =
    placeholder;


  select.appendChild(option);


  select.disabled =
    disabled;

}


// =====================================================
// FILL SELECT
// =====================================================

function fillSelect(
  select,
  values,
  placeholder
) {

  if (!select) {
    return;
  }


  select.innerHTML = '';


  const firstOption =
    document.createElement('option');


  firstOption.value = '';

  firstOption.textContent =
    placeholder;


  select.appendChild(
    firstOption
  );


  values.forEach(value => {

    const option =
      document.createElement('option');


    option.value =
      value;

    option.textContent =
      value;


    select.appendChild(
      option
    );

  });


  select.disabled =
    values.length === 0;

}


// =====================================================
// LOAD LOCATION CSV
// =====================================================

async function loadLocations() {

  try {

    console.log(
      'Loading Andhra Pradesh location CSV...'
    );


    const response =
      await fetch(
        '/andhra_pradesh_villages.csv',
        {
          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        'Cannot load andhra_pradesh_villages.csv. HTTP ' +
        response.status
      );

    }


    const csvText =
      await response.text();


    if (!csvText.trim()) {

      throw new Error(
        'andhra_pradesh_villages.csv is empty.'
      );

    }


    // =================================================
    // CSV LINES
    // =================================================

    const lines =
      csvText
        .split(/\r?\n/)
        .filter(
          line => line.trim()
        );


    if (lines.length < 2) {

      throw new Error(
        'CSV does not contain location records.'
      );

    }


    // =================================================
    // HEADER
    // =================================================

    const headers =
      parseFamilyCSVLine(
        lines[0]
      );


    console.log(
      'CSV Headers:',
      headers
    );


    // =================================================
    // YOUR EXACT CSV STRUCTURE
    //
    // 0 State
    // 1 District
    // 2 District Code
    // 3 Mandal
    // 4 Mandal Code
    // 5 Village
    // 6 Village (Native)
    // 7 Native Source
    // 8 Village Code
    // 9 Pincode
    // 10 Category
    // 11 Status
    // =================================================

    const districtIndex = 1;

    const mandalIndex = 3;

    const villageIndex = 5;


    // =================================================
    // VERIFY CSV
    // =================================================

    if (
      normalizeLocation(
        headers[districtIndex]
      ) !== 'district'
    ) {

      throw new Error(
        'CSV District column is incorrect.'
      );

    }


    if (
      normalizeLocation(
        headers[mandalIndex]
      ) !== 'mandal'
    ) {

      throw new Error(
        'CSV Mandal column is incorrect.'
      );

    }


    if (
      normalizeLocation(
        headers[villageIndex]
      ) !== 'village'
    ) {

      throw new Error(
        'CSV Village column is incorrect.'
      );

    }


    // =================================================
    // READ CSV RECORDS
    // =================================================

    locations = [];


    for (
      let i = 1;
      i < lines.length;
      i++
    ) {

      const columns =
        parseFamilyCSVLine(
          lines[i]
        );


      const district =
        String(
          columns[districtIndex] || ''
        ).trim();


      const mandal =
        String(
          columns[mandalIndex] || ''
        ).trim();


      const village =
        String(
          columns[villageIndex] || ''
        ).trim();


      if (
        district &&
        mandal &&
        village
      ) {

        locations.push({

          district:
            district,

          mandal:
            mandal,

          village:
            village

        });

      }

    }


    console.log(
      'Total location records:',
      locations.length
    );


    if (
      locations.length === 0
    ) {

      throw new Error(
        'No District/Mandal/Village records found in CSV.'
      );

    }


    // =================================================
    // LOAD DISTRICT LISTS
    // =================================================

    populateDistricts();


    console.log(
      'District dropdowns loaded successfully.'
    );

  }

  catch (error) {

    console.error(
      'LOCATION CSV ERROR:',
      error
    );


    if (status) {

      status.className =
        'error';

      status.textContent =
        error.message ||
        'Failed to load location data.';

    }

  }

}


// =====================================================
// GET UNIQUE DISTRICTS
// =====================================================

function getDistricts() {

  const map =
    new Map();


  locations.forEach(item => {

    const key =
      normalizeLocation(
        item.district
      );


    if (!map.has(key)) {

      map.set(
        key,
        item.district
      );

    }

  });


  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      a.localeCompare(b)
  );

}


// =====================================================
// POPULATE DISTRICTS
// =====================================================

function populateDistricts() {

  const districts =
    getDistricts();


  // PERMANENT

  fillSelect(
    districtSelect,
    districts,
    'Select District / జిల్లా ఎంచుకోండి'
  );


  resetSelect(
    mandalSelect,
    'Select Mandal / మండలం ఎంచుకోండి',
    true
  );


  resetSelect(
    villageSelect,
    'Select Village / గ్రామం ఎంచుకోండి',
    true
  );


  // PRESENT

  fillSelect(
    presentDistrictSelect,
    districts,
    'Select District / జిల్లా ఎంచుకోండి'
  );


  resetSelect(
    presentMandalSelect,
    'Select Mandal / మండలం ఎంచుకోండి',
    true
  );


  resetSelect(
    presentVillageSelect,
    'Select Village / గ్రామం ఎంచుకోండి',
    true
  );

}


// =====================================================
// GET MANDALS FOR DISTRICT
// =====================================================

function getMandals(
  district
) {

  const map =
    new Map();


  locations
    .filter(item =>
      normalizeLocation(
        item.district
      ) ===
      normalizeLocation(
        district
      )
    )
    .forEach(item => {

      const key =
        normalizeLocation(
          item.mandal
        );


      if (!map.has(key)) {

        map.set(
          key,
          item.mandal
        );

      }

    });


  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      a.localeCompare(b)
  );

}


// =====================================================
// GET VILLAGES
// =====================================================

function getVillages(
  district,
  mandal
) {

  const map =
    new Map();


  locations
    .filter(item =>

      normalizeLocation(
        item.district
      ) ===
      normalizeLocation(
        district
      )

      &&

      normalizeLocation(
        item.mandal
      ) ===
      normalizeLocation(
        mandal
      )

    )
    .forEach(item => {

      const key =
        normalizeLocation(
          item.village
        );


      if (!map.has(key)) {

        map.set(
          key,
          item.village
        );

      }

    });


  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      a.localeCompare(b)
  );

}


// =====================================================
// PERMANENT DISTRICT CHANGE
// =====================================================

if (districtSelect) {

  districtSelect.addEventListener(
    'change',
    function () {

      const district =
        this.value;


      resetSelect(
        mandalSelect,
        'Select Mandal / మండలం ఎంచుకోండి',
        true
      );


      resetSelect(
        villageSelect,
        'Select Village / గ్రామం ఎంచుకోండి',
        true
      );


      if (!district) {
        return;
      }


      const mandals =
        getMandals(
          district
        );


      fillSelect(
        mandalSelect,
        mandals,
        'Select Mandal / మండలం ఎంచుకోండి'
      );

    }
  );

}


// =====================================================
// PERMANENT MANDAL CHANGE
// =====================================================

if (mandalSelect) {

  mandalSelect.addEventListener(
    'change',
    function () {

      const district =
        districtSelect
          ? districtSelect.value
          : '';


      const mandal =
        this.value;


      resetSelect(
        villageSelect,
        'Select Village / గ్రామం ఎంచుకోండి',
        true
      );


      if (
        !district ||
        !mandal
      ) {

        return;

      }


      const villages =
        getVillages(
          district,
          mandal
        );


      fillSelect(
        villageSelect,
        villages,
        'Select Village / గ్రామం ఎంచుకోండి'
      );

    }
  );

}


// =====================================================
// PRESENT DISTRICT CHANGE
// =====================================================

if (presentDistrictSelect) {

  presentDistrictSelect.addEventListener(
    'change',
    function () {

      const district =
        this.value;


      resetSelect(
        presentMandalSelect,
        'Select Mandal / మండలం ఎంచుకోండి',
        true
      );


      resetSelect(
        presentVillageSelect,
        'Select Village / గ్రామం ఎంచుకోండి',
        true
      );


      if (!district) {
        return;
      }


      const mandals =
        getMandals(
          district
        );


      fillSelect(
        presentMandalSelect,
        mandals,
        'Select Mandal / మండలం ఎంచుకోండి'
      );

    }
  );

}


// =====================================================
// PRESENT MANDAL CHANGE
// =====================================================

if (presentMandalSelect) {

  presentMandalSelect.addEventListener(
    'change',
    function () {

      const district =
        presentDistrictSelect
          ? presentDistrictSelect.value
          : '';


      const mandal =
        this.value;


      resetSelect(
        presentVillageSelect,
        'Select Village / గ్రామం ఎంచుకోండి',
        true
      );


      if (
        !district ||
        !mandal
      ) {

        return;

      }


      const villages =
        getVillages(
          district,
          mandal
        );


      fillSelect(
        presentVillageSelect,
        villages,
        'Select Village / గ్రామం ఎంచుకోండి'
      );

    }
  );

}


// =====================================================
// PDF FIELD MAPPING
// =====================================================

const mapping = {

  // BASIC DETAILS

  aadhaar:
    'aadhaar',

  applicantName:
    'applicant_name',

  relationName:
    'relation_name',

  gender:
    'gender',

  dateOfBirth:
    'date_of_birth',


  // PERMANENT ADDRESS

  doorNo:
    'door_no',

  locality:
    'locality',

  district:
    'district',

  mandal:
    'mandal',

  village:
    'village',

  pincode:
    'pincode',


  // PRESENT ADDRESS

  presentDoorNo:
    'present_door_no',

  presentLocality:
    'present_locality',

  state:
    'state',

  presentDistrict:
    'present_district',

  presentMandal:
    'present_mandal',

  presentVillage:
    'present_village',

  presentPincode:
    'present_pincode',


  // CONTACT

  mobile:
    'mobile',

  phone:
    'phone',

  email:
    'email',


  // OTHER

  remarks:
    'remarks',

  rationCard:
    'ration_card',

  deliveryType:
    'delivery_type',


  // DECEASED DETAILS

  deceasedName:
    'deceased_name',

  deceasedFather:
    'deceased_father',

  dateOfDeath:
    'date_of_death',

  reasonDeath:
    'reason_death',

  occupation:
    'occupation',

  deceasedAadhaar:
    'deceased_aadhaar',

  deathPlace:
    'death_place',

  enrolment:
    'enrolment',


  // MEMBER 1

  member1_name:
    'member1_name',

  member1_age:
    'member1_age',

  member1_gender:
    'member1_gender',

  member1_relation:
    'member1_relation',

  member1_marital:
    'member1_marital',

  member1_aadhaar:
    'member1_aadhaar',


  // MEMBER 2

  member2_name:
    'member2_name',

  member2_age:
    'member2_age',

  member2_gender:
    'member2_gender',

  member2_relation:
    'member2_relation',

  member2_marital:
    'member2_marital',

  member2_aadhaar:
    'member2_aadhaar',


  // MEMBER 3

  member3_name:
    'member3_name',

  member3_age:
    'member3_age',

  member3_gender:
    'member3_gender',

  member3_relation:
    'member3_relation',

  member3_marital:
    'member3_marital',

  member3_aadhaar:
    'member3_aadhaar',


  // MEMBER 4

  member4_name:
    'member4_name',

  member4_age:
    'member4_age',

  member4_gender:
    'member4_gender',

  member4_relation:
    'member4_relation',

  member4_marital:
    'member4_marital',

  member4_aadhaar:
    'member4_aadhaar',


  // MEMBER 5

  member5_name:
    'member5_name',

  member5_age:
    'member5_age',

  member5_gender:
    'member5_gender',

  member5_relation:
    'member5_relation',

  member5_marital:
    'member5_marital',

  member5_aadhaar:
    'member5_aadhaar',


  // MEMBER 6

  member6_name:
    'member6_name',

  member6_age:
    'member6_age',

  member6_gender:
    'member6_gender',

  member6_relation:
    'member6_relation',

  member6_marital:
    'member6_marital',

  member6_aadhaar:
    'member6_aadhaar'

};


// =====================================================
// PDF SUBMIT
// =====================================================

if (form) {

  form.addEventListener(
    'submit',
    async function (e) {

      e.preventDefault();


      const button =
        form.querySelector('button');


      if (!button) {

        console.error(
          'Submit button not found.'
        );

        return;

      }


      button.disabled = true;


      if (status) {

        status.className = '';

        status.textContent =
          'Generating PDF...';

      }


      // =================================================
      // GET FORM DATA
      // =================================================

      const raw =
        Object.fromEntries(
          new FormData(form)
        );


      const data = {};


      // =================================================
      // MAP FORM DATA
      // =================================================

      Object.entries(
        mapping
      ).forEach(
        ([from, to]) => {

          data[to] =
            raw[from] || '';

        }
      );


      // =================================================
      // KEEP ORIGINAL FORM DATA
      // =================================================

      data.__checks = {};


      Object.keys(raw).forEach(
        key => {

          data.__checks[key] =
            raw[key] || '';

        }
      );


      // =================================================
      // PDF REQUEST
      // =================================================

      try {

        const response =
          await fetch(
            '/api/pdf/family-member',
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


        if (!response.ok) {

          const errorData =
            await response
              .json()
              .catch(
                () => ({})
              );


          throw new Error(
            errorData.message ||
            'PDF generation failed'
          );

        }


        // =================================================
        // GET PDF
        // =================================================

        const blob =
          await response.blob();


        // =================================================
        // CREATE DOWNLOAD
        // =================================================

        const url =
          URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            'a'
          );


        link.href =
          url;


        link.download =
          'family-member.pdf';


        document.body.appendChild(
          link
        );


        link.click();


        link.remove();


        // =================================================
        // CLEAN URL
        // =================================================

        setTimeout(
          () => {

            URL.revokeObjectURL(
              url
            );

          },
          1000
        );


        // =================================================
        // SUCCESS
        // =================================================

        if (status) {

          status.className =
            'success';

          status.textContent =
            'PDF downloaded successfully.';

        }

      }

      catch (error) {

        console.error(
          'FAMILY MEMBER PDF ERROR:',
          error
        );


        if (status) {

          status.className =
            'error';

          status.textContent =
            error.message ||
            'PDF generation failed.';

        }

      }

      finally {

        button.disabled =
          false;

      }

    }
  );

}


// =====================================================
// START LOCATION LOADING
// =====================================================

loadLocations();