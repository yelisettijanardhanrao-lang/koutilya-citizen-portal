const form = document.getElementById('appForm');
const status = document.getElementById('status');


/* =====================================================
   TITLE CASE
   ===================================================== */

function titleCase(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}


/* =====================================================
   TEXT FIELD AUTO CAPITALIZATION
   ===================================================== */

document
  .querySelectorAll('input[type="text"], textarea')
  .forEach(el => {

    el.addEventListener('blur', () => {

      if (
        !/email|aadhaar|pincode/i.test(el.name)
      ) {
        el.value = titleCase(el.value);
      }

    });

  });


/* =====================================================
   DOWNLOAD DEATH APPLICATION PDF
   ===================================================== */

form.addEventListener('submit', async e => {

  e.preventDefault();


  const b =
    form.querySelector('button');


  b.disabled = true;

  status.textContent =
    'Generating PDF...';

  status.className = '';


  /* ===================================================
     GET FORM DATA
     =================================================== */

  const raw =
    Object.fromEntries(
      new FormData(form)
    );


  /* ===================================================
     FIELD MAPPING
     =================================================== */

  const map = {

    division:
      'division',

    district:
      'district',

    applicantName:
      'applicant_name',

    relationName:
      'relation_name',

    age:
      'age',

    occupation:
      'occupation',

    houseNumber:
      'house_number',

    near:
      'near',

    mandal:
      'mandal',

    /* NEW */
    village:
      'village',

    district2:
      'district2',


    /* ===============================
       DECEASED DETAILS
       =============================== */

    deceasedRelation:
      'deceased_relation',

    deceasedName:
      'deceased_name',

    deceasedAge:
      'deceased_age',

    dateOfDeath:
      'date_of_death',

    deathHouse:
      'death_house',

    deathNear:
      'death_near',

    deathMandal:
      'death_mandal',

    /* NEW */
    deathVillage:
      'death_village',

    deathDistrict:
      'death_district',


    /* ===============================
       OTHER DETAILS
       =============================== */

    authorityMandal:
      'authority_mandal',

    registerMandal:
      'register_mandal',

    purpose:
      'purpose',

    municipalCouncil:
      'municipal_council',

    landline:
      'landline',

    mobile:
      'mobile',

    email:
      'email'

  };


  /* ===================================================
     CREATE DATA FOR BACKEND
     =================================================== */

  const data = {};


  for (
    const [a, c]
    of Object.entries(map)
  ) {

    data[c] =
      raw[a] || '';

  }


  /* ===================================================
     GENERATE PDF
     =================================================== */

  try {

    const r =
      await fetch(
        '/api/pdf/death',
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

      throw new Error(
        (
          await r
            .json()
            .catch(() => ({}))
        ).message ||
        'PDF generation failed'
      );

    }


    /* =================================================
       GET PDF
       ================================================= */

    const blob =
      await r.blob();


    if (
      !blob ||
      blob.size === 0
    ) {

      throw new Error(
        'Empty PDF received from server'
      );

    }


    /* =================================================
       DOWNLOAD
       ================================================= */

    const u =
      URL.createObjectURL(blob);


    const a =
      document.createElement('a');


    a.href = u;

    a.download =
      'Late_Registration_Death_Application.pdf';


    document.body.appendChild(a);

    a.click();

    a.remove();


    setTimeout(
      () => URL.revokeObjectURL(u),
      1000
    );


    status.className =
      'success';

    status.textContent =
      'PDF downloaded successfully.';


  }
  catch (err) {

    console.error(
      'Death PDF Error:',
      err
    );


    status.className =
      'error';

    status.textContent =
      err.message ||
      'PDF generation failed.';


  }
  finally {

    b.disabled = false;

  }

});