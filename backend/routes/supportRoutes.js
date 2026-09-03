const express = require("express");

const router = express.Router();

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ||
  "info@koutilyasolutions.in";

const RESEND_API_KEY =
  process.env.RESEND_API_KEY;

const FROM_EMAIL =
  process.env.SUPPORT_FROM_EMAIL ||
  "Koutilya Citizen Services <info@koutilyasolutions.in>";

/*
============================================================
COMMON RESEND EMAIL FUNCTION
============================================================
*/

async function sendSupportEmail({
  subject,
  text,
}) {
  if (!RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${RESEND_API_KEY}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        from: FROM_EMAIL,

        to: [SUPPORT_EMAIL],

        subject,

        text,
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "RESEND API ERROR:",
      response.status,
      data
    );

    throw new Error(
      data?.message ||
        "Unable to send email through Resend."
    );
  }

  console.log(
    "SUPPORT EMAIL SENT:",
    data
  );

  return data;
}


/*
============================================================
POST /api/support/message
============================================================

Used by:
    Help Chatbot

This keeps your existing chatbot functionality.
============================================================
*/

router.post(
  "/message",
  async (req, res) => {

    try {

      const {
        message,
        page,
        user,
      } = req.body || {};

      /*
      --------------------------------------------------------
      VALIDATE
      --------------------------------------------------------
      */

      if (
        !message ||
        !String(message).trim()
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your query.",
        });
      }

      /*
      --------------------------------------------------------
      CUSTOMER INFORMATION
      --------------------------------------------------------
      */

      const customerName =
        user?.name ||
        user?.fullName ||
        "Portal Customer";

      const mobile =
        user?.mobile ||
        "Not provided";

      const customerEmail =
        user?.email ||
        "Not provided";

      const customerMessage =
        String(message).trim();

      const portalPage =
        page ||
        "Unknown";

      /*
      --------------------------------------------------------
      EMAIL
      --------------------------------------------------------
      */

      const emailText = `
New support query received from Koutilya Citizen Services.

========================================
CUSTOMER DETAILS
========================================

Customer Name:
${customerName}

Mobile:
${mobile}

Email:
${customerEmail}

Portal Page:
${portalPage}

========================================
QUERY
========================================

${customerMessage}

========================================
TIME
========================================

${new Date().toISOString()}
`.trim();

      /*
      --------------------------------------------------------
      SEND
      --------------------------------------------------------
      */

      await sendSupportEmail({
        subject:
          "New Koutilya Citizen Services Support Query",

        text:
          emailText,
      });

      /*
      --------------------------------------------------------
      SUCCESS
      --------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        message:
          "Support request received successfully.",
      });

    } catch (error) {

      console.error(
        "SUPPORT MESSAGE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to submit support request.",
      });
    }
  }
);


/*
============================================================
POST /api/support/complaint
============================================================

Used by:
    Raise a Complaint page

Every submitted complaint is sent to the same
SUPPORT_EMAIL through Resend.
============================================================
*/

router.post(
  "/complaint",
  async (req, res) => {

    try {

      const {
        name,
        mobile,
        email,
        applicationNumber,
        service,
        complaintType,
        complaint,
        description,
        page,
      } = req.body || {};

      /*
      --------------------------------------------------------
      NORMALIZE VALUES
      --------------------------------------------------------
      */

      const customerName =
        String(
          name || ""
        ).trim();

      const customerMobile =
        String(
          mobile || ""
        ).trim();

      const customerEmail =
        String(
          email || ""
        ).trim();

      const applicationNo =
        String(
          applicationNumber || ""
        ).trim();

      const serviceName =
        String(
          service || ""
        ).trim();

      const type =
        String(
          complaintType || ""
        ).trim();

      const complaintText =
        String(
          complaint ||
            description ||
            ""
        ).trim();

      const portalPage =
        String(
          page ||
            "/raise-complaint"
        ).trim();

      /*
      --------------------------------------------------------
      VALIDATION
      --------------------------------------------------------
      */

      if (!customerName) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your name.",
        });
      }

      if (!customerMobile) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your mobile number.",
        });
      }

      if (!complaintText) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your complaint.",
        });
      }

      /*
      --------------------------------------------------------
      EMAIL CONTENT
      --------------------------------------------------------
      */

      const emailText = `
NEW COMPLAINT RECEIVED
KOUTILYA CITIZEN SERVICES

========================================
CUSTOMER DETAILS
========================================

Name:
${customerName}

Mobile:
${customerMobile}

Email:
${customerEmail || "Not provided"}

========================================
APPLICATION DETAILS
========================================

Application Number:
${applicationNo || "Not provided"}

Service:
${serviceName || "Not provided"}

Complaint Type:
${type || "General Complaint"}

Portal Page:
${portalPage}

========================================
COMPLAINT
========================================

${complaintText}

========================================
SUBMITTED
========================================

${new Date().toISOString()}

========================================
END OF COMPLAINT
========================================
`.trim();

      /*
      --------------------------------------------------------
      SEND THROUGH RESEND
      --------------------------------------------------------
      */

      const resendData =
        await sendSupportEmail({
          subject:
            `New Complaint - Koutilya Citizen Services${
              applicationNo
                ? ` - ${applicationNo}`
                : ""
            }`,

          text:
            emailText,
        });

      /*
      --------------------------------------------------------
      SUCCESS
      --------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        message:
          "Complaint submitted successfully. Our support team has been notified.",

        emailId:
          resendData?.id || null,
      });

    } catch (error) {

      console.error(
        "COMPLAINT SUBMISSION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to submit complaint. Please try again.",
      });
    }
  }
);


/*
============================================================
POST /api/support/raise-complaint
============================================================

Alias route.

This gives us compatibility if the frontend uses
/raise-complaint instead of /complaint.
============================================================
*/

router.post(
  "/raise-complaint",
  async (req, res) => {

    try {

      const {
        name,
        mobile,
        email,
        applicationNumber,
        service,
        complaintType,
        complaint,
        description,
        page,
      } = req.body || {};

      const customerName =
        String(
          name || ""
        ).trim();

      const customerMobile =
        String(
          mobile || ""
        ).trim();

      const customerEmail =
        String(
          email || ""
        ).trim();

      const applicationNo =
        String(
          applicationNumber || ""
        ).trim();

      const serviceName =
        String(
          service || ""
        ).trim();

      const type =
        String(
          complaintType || ""
        ).trim();

      const complaintText =
        String(
          complaint ||
            description ||
            ""
        ).trim();

      if (!customerName) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your name.",
        });
      }

      if (!customerMobile) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your mobile number.",
        });
      }

      if (!complaintText) {

        return res.status(400).json({
          success: false,
          message:
            "Please enter your complaint.",
        });
      }

      const emailText = `
NEW COMPLAINT RECEIVED
KOUTILYA CITIZEN SERVICES

========================================
CUSTOMER
========================================

Name:
${customerName}

Mobile:
${customerMobile}

Email:
${customerEmail || "Not provided"}

========================================
APPLICATION
========================================

Application Number:
${applicationNo || "Not provided"}

Service:
${serviceName || "Not provided"}

Complaint Type:
${type || "General Complaint"}

========================================
COMPLAINT
========================================

${complaintText}

========================================
TIME
========================================

${new Date().toISOString()}
`.trim();

      const resendData =
        await sendSupportEmail({
          subject:
            `New Complaint - Koutilya Citizen Services${
              applicationNo
                ? ` - ${applicationNo}`
                : ""
            }`,

          text:
            emailText,
        });

      return res.status(200).json({
        success: true,

        message:
          "Complaint submitted successfully. Our support team has been notified.",

        emailId:
          resendData?.id || null,
      });

    } catch (error) {

      console.error(
        "RAISE COMPLAINT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to submit complaint. Please try again.",
      });
    }
  }
);


/*
============================================================
EXPORT
============================================================
*/

module.exports = router;