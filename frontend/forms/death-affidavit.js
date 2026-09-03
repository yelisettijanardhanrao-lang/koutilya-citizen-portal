/* =====================================================
   DEATH REGISTRATION AFFIDAVIT
   ONE FORM -> TWO SEPARATE PDFs
   NAME / FATHER NAME FORMATTING
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const form =
    document.getElementById("appForm") ||
    document.querySelector("form");

  if (!form) {
    console.error("Death affidavit form not found.");
    return;
  }


  /* =====================================================
     RELATION DROPDOWN
     ===================================================== */

  const relations = [
    ["", "Select"],
    ["S/O", "S/O"],
    ["C/O", "C/O"],
    ["D/O", "D/O"],
    ["W/O", "W/O"]
  ];


  function makeRelationSelect(id) {

    const old =
      document.getElementById(id);

    if (!old || old.tagName === "SELECT") {
      return old;
    }

    const select =
      document.createElement("select");

    select.id = id;
    select.name =
      old.name || id;

    select.required =
      old.required;

    relations.forEach(([value, text]) => {

      const option =
        document.createElement("option");

      option.value = value;
      option.textContent = text;

      select.appendChild(option);

    });

    old.replaceWith(select);

    return select;
  }


  makeRelationSelect(
    "deponentRelation"
  );


  for (let i = 1; i <= 5; i++) {

    makeRelationSelect(
      `joint${i}Relation`
    );

  }


  /* =====================================================
     NAME FIELDS

     These ALWAYS become UPPERCASE.

     Example:
       yelisetti
       Yelisetti
       YELISETTI

     Output:
       YELISETTI
     ===================================================== */

  const NAME_FIELDS = [

    "deponentName",

    "deceasedName",

    "deceasedSpouse",

    "joint1Name",
    "joint1Father",

    "joint2Name",
    "joint2Father",

    "joint3Name",
    "joint3Father",

    "joint4Name",
    "joint4Father",

    "joint5Name",
    "joint5Father"

  ];


  /* =====================================================
     RELATION FIELDS
     ===================================================== */

  const RELATION_FIELDS = [

    "deponentRelation",
    "deceasedRelationship",

    "joint1Relation",
    "joint2Relation",
    "joint3Relation",
    "joint4Relation",
    "joint5Relation"

  ];


  /* =====================================================
     NORMAL TEXT FIELDS

     These use Title Case.

     Example:
       rampachodavaram
       Rampachodavaram
       RAMPACHODAVARAM

     Output:
       Rampachodavaram
     ===================================================== */

  const TITLE_FIELDS = [

    "deponentOccupation",
    "deponentAddress",

    "deathHouse",
    "village",
    "mandal",
    "district",

    "causeOfDeath",
    "gramPanchayat",

    "joint1Village",
    "joint2Village",
    "joint3Village",
    "joint4Village",
    "joint5Village"

  ];


  /* =====================================================
     TITLE CASE

     Keeps common address abbreviations readable.
     ===================================================== */

  function titleCase(value) {

    const text =
      String(value || "")
        .trim()
        .replace(/\s+/g, " ");

    if (!text) {
      return "";
    }


    return text
      .toLowerCase()
      .replace(
        /\b([a-z])/g,
        letter => letter.toUpperCase()
      )
      .replace(
        /\bD\.No\./gi,
        "D.No."
      )
      .replace(
        /\bR\/O\b/gi,
        "R/o"
      )
      .replace(
        /\bS\/O\b/gi,
        "S/O"
      )
      .replace(
        /\bC\/O\b/gi,
        "C/O"
      )
      .replace(
        /\bD\/O\b/gi,
        "D/O"
      )
      .replace(
        /\bW\/O\b/gi,
        "W/O"
      );
  }


  /* =====================================================
     UPPERCASE NAME

     Spaces are preserved.

     Example:
       yelisetti janardhan
       Yelisetti Janardhan

     Output:
       YELISETTI JANARDHAN
     ===================================================== */

  function nameUpper(value) {

    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }


  /* =====================================================
     DECEASED GENDER
     ===================================================== */

  let gender =
    document.getElementById(
      "deceasedGender"
    );


  if (!gender) {

    const deceasedName =
      document.getElementById(
        "deceasedName"
      );


    if (
      deceasedName &&
      deceasedName.parentElement &&
      deceasedName.parentElement.parentElement
    ) {

      const field =
        document.createElement("div");

      field.className =
        "field";

      field.innerHTML = `
        <label for="deceasedGender">
          Deceased Gender
        </label>

        <select
          id="deceasedGender"
          name="deceasedGender"
          required>

          <option value="">
            Select
          </option>

          <option value="Male">
            Male
          </option>

          <option value="Female">
            Female
          </option>

        </select>
      `;


      deceasedName.parentElement.parentElement.insertBefore(
        field,
        deceasedName.parentElement.nextSibling
      );


      gender =
        document.getElementById(
          "deceasedGender"
        );

    }

  }


  /* =====================================================
     FORMAT FIELD VALUE
     ===================================================== */

  function formatField(
    key,
    value
  ) {

    const text =
      String(value || "").trim();


    if (!text) {
      return "";
    }


    /*
       NAME / FATHER NAME
       -> UPPERCASE
    */

    if (
      NAME_FIELDS.includes(key)
    ) {

      return nameUpper(text);

    }


    /*
       RELATIONS
       -> UPPERCASE
    */

    if (
      RELATION_FIELDS.includes(key)
    ) {

      return text.toUpperCase();

    }


    /*
       NORMAL TEXT
       -> TITLE CASE
    */

    if (
      TITLE_FIELDS.includes(key)
    ) {

      return titleCase(text);

    }


    /*
       All other fields:

       - dates remain unchanged
       - numbers remain unchanged
       - pincode remains unchanged
       - email remains unchanged
    */

    return text;
  }


  /* =====================================================
     COLLECT FORM DATA
     ===================================================== */

  function collectData() {

    const data = {};


    form
      .querySelectorAll(
        "input, select, textarea"
      )
      .forEach(element => {

        const key =
          element.name ||
          element.id;


        if (!key) {
          return;
        }


        const rawValue =
          String(
            element.value || ""
          ).trim();


        data[key] =
          formatField(
            key,
            rawValue
          );

      });


    /* ---------------------------------------------------
       Automatic gender pronouns
       --------------------------------------------------- */

    const g =
      String(
        data.deceasedGender || ""
      )
      .trim()
      .toLowerCase();


    if (
      g === "female" ||
      g === "f"
    ) {

      data.deceasedPronoun =
        "she";

      data.deceasedObjectPronoun =
        "her";

      data.deceasedPossessive =
        "her";

    } else {

      data.deceasedPronoun =
        "he";

      data.deceasedObjectPronoun =
        "him";

      data.deceasedPossessive =
        "his";

    }


    return data;
  }


  /* =====================================================
     SUBMIT
     ===================================================== */

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const data =
        collectData();


      console.log(
        "Formatted affidavit data:",
        data
      );


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      const status =
        document.getElementById(
          "status"
        ) ||
        document.getElementById(
          "resultStatus"
        );


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Generating...";

      }


      if (status) {

        status.textContent =
          "Generating two affidavit PDFs...";

      }


      try {

        const response =
          await fetch(
            "/api/pdf/death-affidavit",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(data)
            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {

          throw new Error(
            result.message ||
            "PDF generation failed"
          );

        }


        const individual =
          document.getElementById(
            "individualDownload"
          );


        const joint =
          document.getElementById(
            "jointDownload"
          );


        if (individual) {

          individual.href =
            result.individualPdf;

          individual.style.display =
            "inline-block";

        }


        if (joint) {

          joint.href =
            result.jointPdf;

          joint.style.display =
            "inline-block";

        }


        const resultBox =
          document.getElementById(
            "result"
          );


        if (resultBox) {

          resultBox.style.display =
            "block";

        }


        if (status) {

          status.textContent =
            "Two affidavit PDFs generated successfully.";

        }

      }

      catch (error) {

        console.error(
          "Death affidavit generation error:",
          error
        );


        if (status) {

          status.textContent =
            error.message ||
            "Unable to generate affidavit PDFs.";

        }

      }

      finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Generate Affidavit PDFs";

        }

      }

    }
  );

});
