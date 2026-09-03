const form = document.getElementById('appForm');

const status = document.getElementById('status');


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
   DOWNLOAD CASTE / INTEGRATED APPLICATION PDF
   THIS FUNCTION IS CALLED BY caste-integrated.html
   ===================================================== */

export async function downloadCasteIntegratedApplication(raw) {

  const data = {};


  const mapping = {

    "applicantName": "applicant_name",

    "fatherName": "father_name",

    "motherName": "mother_name",

    "gender": "gender",

    "mandalDivision": "mandal_division",

    "district": "district",

    "village": "village",

    "presentAddress": "present_address",

    "permanentAddress1": "permanent_address1",

    "permanentAddress2": "permanent_address2",

    "permanentAddress3": "permanent_address3",

    "permanentAddress4": "permanent_address4",

    "dateOfBirth": "date_of_birth",

    "age": "age",

    "placeOfBirth": "place_of_birth",

    "ordinaryResidence1": "ordinary_residence1",

    "ordinaryResidence2": "ordinary_residence2",

    "ordinaryResidence3": "ordinary_residence3",

    "previousCasteCertificate": "previous_caste_certificate",

    "casteDetails1": "caste_details1",

    "casteDetails2": "caste_details2",

    "fatherCaste": "father_caste",

    "motherCaste": "mother_caste",

    "applicantReligion": "applicant_religion",

    "fatherReligion": "father_religion",

    "motherReligion": "mother_religion",

    "birthOrAdoption": "birth_or_adoption",

    "place": "place",

    "date": "date",

    "parentGuardianSignature": "parent_guardian_signature",

    "applicantSignature": "applicant_signature",

    "landline": "landline",

    "mobile": "mobile",

    "email": "email"

  };


  Object.entries(mapping).forEach(([from, to]) => {

    data[to] = raw[from] || '';

  });


  try {

    const r = await fetch(
      '/api/pdf/caste-integrated',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(data)

      }
    );


    if (!r.ok) {

      let message = 'PDF generation failed';

      try {

        const error = await r.json();

        message =
          error.message ||
          error.error ||
          message;

      } catch (_) {}

      throw new Error(message);

    }


    const blob = await r.blob();


    if (!blob || blob.size === 0) {

      throw new Error(
        'Empty PDF received from server'
      );

    }


    const url =
      URL.createObjectURL(blob);


    const a =
      document.createElement('a');


    a.href = url;

    a.download =
      'Caste_Integrated_Application.pdf';


    document.body.appendChild(a);

    a.click();

    a.remove();


    setTimeout(
      () => URL.revokeObjectURL(url),
      1000
    );


    return true;

  }
  catch (err) {

    console.error(
      'Caste PDF error:',
      err
    );

    throw err;

  }

}