export async function downloadLateBirthApplication(form) {

  const response = await fetch(
    'http://localhost:5000/api/pdf/late-birth',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({

        // ==============================
        // APPLICANT DETAILS
        // ==============================

        division: form.division || '',
        district: form.district || '',

        applicant_name: form.applicantName || '',
        relation_name: form.parentName || '',

        age: form.age || '',
        occupation: form.occupation || '',

        house_number: form.houseNumber || '',
        near: form.near || '',

        mandal: form.mandal || '',
        district2: form.district || '',


        // ==============================
        // WIFE / CHILD DETAILS
        // ==============================

        wife_name: form.wifeName || '',
        wife_age: form.wifeAge || '',

        child_name: form.childName || '',
        date_of_birth: form.dateOfBirth || '',
        birth_place: form.birthPlace || '',


        // ==============================
        // BIRTH / DELIVERY DETAILS
        // ==============================

        delivery_house: form.deliveryHouse || '',
        delivery_near: form.deliveryNear || '',

        delivery_mandal: form.deliveryMandal || '',
        delivery_district: form.deliveryDistrict || '',

        authority_mandal: form.authorityMandal || '',
        register_mandal: form.registerMandal || '',

        municipal_council: form.municipalCouncil || '',


        // ==============================
        // CONTACT DETAILS
        // ==============================

        landline: form.landline || '',
        mobile: form.mobile || '',
        email: form.email || ''

      })
    }
  );


  // ==============================
  // ERROR HANDLING
  // ==============================

  if (!response.ok) {

    let message = 'PDF generation failed';

    try {

      const error = await response.json();

      if (error && error.message) {
        message = error.message;
      }

    } catch (_) {
      // Ignore JSON parsing error
    }

    throw new Error(message);
  }


  // ==============================
  // DOWNLOAD PDF
  // ==============================

  const blob = await response.blob();

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;

  a.download =
    'Late_Registration_Birth_Application.pdf';

  document.body.appendChild(a);

  a.click();

  a.remove();


  // Clean up object URL

  setTimeout(() => {

    URL.revokeObjectURL(url);

  }, 1000);

}