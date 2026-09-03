const form = document.getElementById('appForm');
const status = document.getElementById('status');


/* =====================================================
   TITLE CASE
   Example:
   YELISETTI JANARDHAN
   yelisetti janardhan
   yElIsEtTi jAnArDhAn

   Becomes:
   Yelisetti Janardhan
   ===================================================== */

function titleCase(value) {

  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());

}


/* =====================================================
   INDIAN NUMBER WORDS
   ===================================================== */

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen'
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety'
];


function twoDigitWords(num) {

  num = Number(num) || 0;

  if (num < 20) {
    return ones[num];
  }

  const ten = Math.floor(num / 10);
  const one = num % 10;

  return tens[ten] + (one ? ' ' + ones[one] : '');

}


function numberToWordsIndian(num) {

  num = Math.floor(Number(num) || 0);

  if (num === 0) {
    return 'Zero';
  }

  let result = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore) {
    result += twoDigitWords(crore) + ' Crore ';
  }

  if (lakh) {
    result += twoDigitWords(lakh) + ' Lakh ';
  }

  if (thousand) {
    result += twoDigitWords(thousand) + ' Thousand ';
  }

  if (hundred) {
    result += ones[hundred] + ' Hundred ';
  }

  if (num) {

    if (result.trim()) {
      result += 'and ';
    }

    result += twoDigitWords(num);

  }

  return result.trim();

}


/* =====================================================
   FORMAT AMOUNT
   ===================================================== */

function numericValue(value) {

  const cleaned =
    String(value || '')
      .replace(/,/g, '')
      .replace(/[^\d.]/g, '');

  const number =
    parseFloat(cleaned);

  return Number.isFinite(number)
    ? number
    : 0;

}


/* =====================================================
   ANNUAL INCOME → WORDS
   ===================================================== */

const annualIncome =
  document.querySelector('[name="annualIncome"]');

const annualIncomeWords =
  document.querySelector('[name="annualIncomeWords"]');


function updateAnnualIncomeWords() {

  if (!annualIncome || !annualIncomeWords) {
    return;
  }

  const amount =
    numericValue(annualIncome.value);

  if (!annualIncome.value.trim()) {

    annualIncomeWords.value = '';

    return;

  }

  annualIncomeWords.value =
    numberToWordsIndian(amount) +
    ' Rupees Only';

}


if (annualIncome) {

  annualIncome.addEventListener(
    'input',
    updateAnnualIncomeWords
  );

}


/* =====================================================
   INCOME TOTAL
   ===================================================== */

const incomeFields = [

  'landBuildingsIncome',
  'businessIncome',
  'husbandWifeSalaryIncome',
  'dailyWageIncome',
  'otherIncome'

];


const totalIncome =
  document.querySelector('[name="totalIncome"]');


function calculateTotalIncome() {

  let total = 0;

  incomeFields.forEach(name => {

    const field =
      document.querySelector(
        `[name="${name}"]`
      );

    if (field) {

      total +=
        numericValue(field.value);

    }

  });


  if (totalIncome) {

    if (total === 0) {

      totalIncome.value = '';

    } else {

      totalIncome.value =
        total.toString();

    }

  }


  return total;

}


/* =====================================================
   WATCH ALL FIVE INCOME FIELDS
   ===================================================== */

incomeFields.forEach(name => {

  const field =
    document.querySelector(
      `[name="${name}"]`
    );

  if (field) {

    field.addEventListener(
      'input',
      calculateTotalIncome
    );

  }

});


/* =====================================================
   AUTO TITLE CASE
   ===================================================== */

document
  .querySelectorAll(
    'input[type="text"], textarea'
  )
  .forEach(el => {

    el.addEventListener(
      'blur',
      () => {

        if (
          !/email|pincode|income|number|signature/i
            .test(el.name)
        ) {

          el.value =
            titleCase(el.value);

        }

      }
    );

  });


/* =====================================================
   FORM SUBMIT
   ===================================================== */

form.addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const button =
      form.querySelector('button');


    button.disabled = true;


    status.className = '';

    status.textContent =
      'Generating PDF...';


    /*
     * Make sure automatic calculations
     * are completed before PDF generation.
     */

    updateAnnualIncomeWords();

    const calculatedTotal =
      calculateTotalIncome();


    /*
     * If total is calculated from the
     * five income fields, use that value.
     */

    if (
      totalIncome &&
      calculatedTotal > 0
    ) {

      totalIncome.value =
        calculatedTotal.toString();

    }


    const raw =
      Object.fromEntries(
        new FormData(form)
      );


    /* =================================================
       ONLINE FORM → PDF MAPPING
       ================================================= */

    const mapping = {

      applicantName:
        'applicant_name',

      fatherName:
        'father_name',

      district:
        'district',

      mandal:
        'mandal',

      village:
        'village',

      houseNumber:
        'house_number',

      rationCardNumber:
        'ration_card_number',

      rationCardType:
        'ration_card_type',

      annualIncome:
        'annual_income',

      annualIncomeWords:
        'annual_income_words',

      certificatePurpose:
        'certificate_purpose',

      gender:
        'gender',

      dateOfBirth:
        'date_of_birth',

      locality:
        'locality',

      pincode:
        'pincode',

      landBuildingsIncome:
        'land_buildings_income',

      businessIncome:
        'business_income',

      husbandWifeSalaryIncome:
        'husband_wife_salary_income',

      dailyWageIncome:
        'daily_wage_income',

      otherIncome:
        'other_income',

      otherIncomeDetails:
        'other_income_details',

      totalIncome:
        'total_income',

      applicantSignature:
        'applicant_signature',

      guardianSignature:
        'guardian_signature',

      mobile:
        'mobile',

      mailId:
        'mail_id'

    };


    const data = {};


    Object.entries(mapping)
      .forEach(([from, to]) => {

        data[to] =
          raw[from] || '';

      });


    console.log(
      'Income PDF data:',
      data
    );


    try {

      const response =
        await fetch(
          '/api/pdf/income',
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

        const error =
          await response
            .json()
            .catch(() => ({}));


        throw new Error(
          error.message ||
          'PDF generation failed'
        );

      }


      const blob =
        await response.blob();


      const url =
        URL.createObjectURL(blob);


      const a =
        document.createElement('a');


      a.href = url;

      a.download =
        'Income_Certificate_Application.pdf';


      document.body.appendChild(a);

      a.click();

      a.remove();


      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );


      status.className =
        'success';

      status.textContent =
        'PDF downloaded successfully.';


    }
    catch (err) {

      console.error(
        'Income PDF error:',
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