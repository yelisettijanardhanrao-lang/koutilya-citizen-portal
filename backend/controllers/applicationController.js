const mongoose = require("mongoose");

const Application =
  require("../models/Application");

const User =
  require("../models/User");

const Transaction =
  require("../models/Transaction");

const generatePDF =
  require("../utils/generatePDF");

/*
=========================================================
APPLICATION NUMBER
=========================================================
*/

function createApplicationNumber() {
  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      10000000 +
      Math.random() * 90000000
    );

  return `APP${year}${random}`;
}

/*
=========================================================
SAVE APPLICATION
=========================================================
*/

exports.saveApplication =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      /*
      ---------------------------------------------------
      USER
      ---------------------------------------------------
      */

      const userId =
        req.user?.id ||
        req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message:
            "User ID is required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid User ID.",
        });
      }

      /*
      ---------------------------------------------------
      SERVICE
      ---------------------------------------------------
      */

      const service =
        String(
          body.service ||
          ""
        ).trim();

      if (!service) {
        return res.status(400).json({
          success: false,
          message:
            "Service is required.",
        });
      }

      /*
      ---------------------------------------------------
      SERVICE DATA
      ---------------------------------------------------
      */

      const serviceData =
        body.serviceData &&
        typeof body.serviceData ===
          "object"
          ? body.serviceData
          : {};

      /*
      ---------------------------------------------------
      APPLICATION NUMBER
      ---------------------------------------------------
      */

      const applicationNumber =
        createApplicationNumber();

      /*
      ---------------------------------------------------
      CREATE
      ---------------------------------------------------
      */

      const application =
        await Application.create({
          applicationNumber,

          userId,

          service,

          applicantName:
            body.applicantName ||
            serviceData.applicantName ||
            "",

          fatherName:
            body.fatherName ||
            serviceData.fatherName ||
            "",

          motherName:
            body.motherName ||
            serviceData.motherName ||
            "",

          mobile:
            body.mobile ||
            serviceData.mobile ||
            "",

          district:
            body.district ||
            serviceData.district ||
            "",

          mandal:
            body.mandal ||
            serviceData.mandal ||
            "",

          village:
            body.village ||
            serviceData.village ||
            "",

          house:
            body.house ||
            serviceData.house ||
            "",

          street:
            body.street ||
            serviceData.street ||
            "",

          ration:
            body.ration ||
            serviceData.ration ||
            "",

          aadhaar:
            body.aadhaar ||
            serviceData.aadhaar ||
            "",

          totalVillages:
            body.totalVillages ||
            "",

          villageDetails:
            body.villageDetails ||
            "",

          yearDetails:
            body.yearDetails ||
            "",

          fasaliDetails:
            body.fasaliDetails ||
            "",

          totalSurveyNumbers:
            body.totalSurveyNumbers ||
            "",

          surveyNo:
            body.surveyNo ||
            "",

          serviceData,

          paymentStatus:
            "Pending",

          applicationStatus:
            "Draft",

          pdfUrl:
            "",

          pdfGeneratedAt:
            null,
        });

      console.log(
        "========================================"
      );

      console.log(
        "APPLICATION CREATED"
      );

      console.log(
        "Application Number:",
        application.applicationNumber
      );

      console.log(
        "Service:",
        application.service
      );

      console.log(
        "Application ID:",
        application._id
      );

      console.log(
        "========================================"
      );

      return res.status(201).json({
        success: true,
        message:
          "Application Saved Successfully",
        application,
      });

    } catch (error) {
      console.error(
        "SAVE APPLICATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to save application.",
      });
    }
  };

/*
=========================================================
GET ALL APPLICATIONS
=========================================================
*/

exports.getAllApplications =
  async (req, res) => {
    try {
      const applications =
        await Application.find()
          .populate(
            "userId",
            "fullName mobile email"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        applications,
      });

    } catch (error) {
      console.error(
        "GET ALL APPLICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
=========================================================
GET MY APPLICATIONS
=========================================================
*/

exports.getMyApplications =
  async (req, res) => {
    try {
      const userId = req.params.userId;

      if (
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid User ID.",
        });
      }

      if (
        req.user?.role !== "admin" &&
        String(req.user?.id) !== String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own applications.",
        });
      }

      const applications =
        await Application.find({ userId }).sort({
          createdAt: -1,
        });

      return res.json({
        success: true,
        applications,
      });

    } catch (error) {
      console.error(
        "GET MY APPLICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
=========================================================
GET SINGLE APPLICATION
=========================================================
*/

exports.getApplicationById =
  async (req, res) => {
    try {
      const id =
        req.params.id;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid application ID.",
        });
      }

      const application =
        await Application.findById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found.",
        });
      }

      if (
        req.user?.role !== "admin" &&
        String(application.userId) !== String(req.user?.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to view this application.",
        });
      }

      return res.json({
        success: true,
        application,
      });

    } catch (error) {
      console.error(
        "GET APPLICATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
=========================================================
UPDATE APPLICATION STATUS
=========================================================
*/

exports.updateApplicationStatus =
  async (req, res) => {
    try {
      const id =
        req.params.id;

      const status =
        String(
          req.body?.status ||
          ""
        ).trim();

      const allowed = [
        "Draft",
        "Submitted",
        "Processing",
        "Approved",
        "Rejected",
      ];

      if (
        !allowed.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid application status.",
        });
      }

      const application =
        await Application.findByIdAndUpdate(
          id,
          {
            applicationStatus:
              status,
          },
          {
            new: true,
          }
        );

      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Application not found.",
        });
      }

      return res.json({
        success: true,
        message:
          "Application status updated successfully.",
        application,
      });

    } catch (error) {
      console.error(
        "UPDATE APPLICATION STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
=========================================================
PAYMENT SUCCESS + PDF GENERATION
=========================================================
*/

exports.markPaymentSuccess =
  async (req, res) => {
    let walletDebited = false;
    let debitedUserId = null;
    let debitedAmount = 0;

    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application ID.",
        });
      }

      const application = await Application.findById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found.",
        });
      }

      if (
        req.user?.role !== "admin" &&
        String(application.userId) !== String(req.user?.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to pay for this application.",
        });
      }

      if (application.paymentStatus === "Paid") {
        return res.json({
          success: true,
          message: "Payment already completed.",
          application,
        });
      }

      const amount = Number(
        application.paymentAmount || 2
      );

      const payer = await User.findById(
        application.userId
      );

      if (!payer) {
        return res.status(404).json({
          success: false,
          message: "Application owner was not found.",
        });
      }

      const balanceBefore = Number(
        payer.walletBalance || 0
      );

      if (balanceBefore < amount) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient wallet balance. Required ₹${amount.toFixed(
              2
            )}, available ₹${balanceBefore.toFixed(2)}.`,
          walletBalance: balanceBefore,
        });
      }

      /*
      ---------------------------------------------------
      GENERATE PDF FIRST
      ---------------------------------------------------
      */

      if (!application.pdfUrl) {
        const pdfUrl =
          await generatePDF(application);

        if (!pdfUrl) {
          throw new Error(
            "PDF generator returned an empty URL."
          );
        }

        application.pdfUrl = pdfUrl;
        application.pdfGeneratedAt = new Date();
      }

      /*
      ---------------------------------------------------
      DEDUCT WALLET
      ---------------------------------------------------
      */

      const updatedPayer =
        await User.findOneAndUpdate(
          {
            _id: payer._id,
            walletBalance: { $gte: amount },
          },
          {
            $inc: {
              walletBalance: -amount,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedPayer) {
        return res.status(400).json({
          success: false,
          message:
            "Wallet balance changed. Please try payment again.",
        });
      }

      walletDebited = true;
      debitedUserId = payer._id;
      debitedAmount = amount;

      const balanceAfter =
        Number(updatedPayer.walletBalance || 0);

      const paymentReference =
        `PAY-${Date.now()}-${String(
          application._id
        ).slice(-6)}`;

      /*
      ---------------------------------------------------
      UPDATE APPLICATION
      ---------------------------------------------------
      */

      application.paymentStatus = "Paid";
      application.paymentId = paymentReference;
      application.applicationStatus = "Submitted";

      await application.save();

      /*
      ---------------------------------------------------
      TRANSACTION RECORD
      ---------------------------------------------------
      */

      await Transaction.create({
        userId: payer._id,
        type: "debit",
        amount,
        balanceBefore,
        balanceAfter,
        serviceName: application.service,
        reference: paymentReference,
        status: "Success",
        description:
          `Service payment for ${application.applicationNumber}`,
        applicationId: application._id,
        applicationNumber:
          application.applicationNumber,
        createdBy:
          req.user?.id || null,
      });

      const savedApplication =
        await Application.findById(
          application._id
        );

      if (!savedApplication) {
        throw new Error(
          "Application could not be reloaded after payment."
        );
      }

      if (!savedApplication.pdfUrl) {
        throw new Error(
          "PDF URL was not saved to the database."
        );
      }

      return res.json({
        success: true,
        message: "Payment Successful",
        walletBalance: balanceAfter,
        application: savedApplication,
      });
    } catch (error) {
      /*
      ---------------------------------------------------
      COMPENSATE WALLET IF A POST-DEBIT ERROR OCCURS
      ---------------------------------------------------
      */

      if (
        walletDebited &&
        debitedUserId &&
        debitedAmount > 0
      ) {
        try {
          await User.findByIdAndUpdate(
            debitedUserId,
            {
              $inc: {
                walletBalance: debitedAmount,
              },
            }
          );

          // Restore application to unpaid state if it was saved.
          if (
            req.params.id &&
            mongoose.Types.ObjectId.isValid(
              req.params.id
            )
          ) {
            await Application.findByIdAndUpdate(
              req.params.id,
              {
                paymentStatus: "Pending",
                paymentId: "",
                applicationStatus: "Draft",
              }
            );
          }
        } catch (compensationError) {
          console.error(
            "PAYMENT COMPENSATION ERROR:",
            compensationError
          );
        }
      }

      console.error(
        "PAYMENT/PDF ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Payment/PDF generation failed.",
      });
    }
  };

/*
=========================================================
DASHBOARD STATISTICS
=========================================================
*/

exports.getDashboardStats =
  async (req, res) => {
    try {
      const totalApplications =
        await Application.countDocuments();

      const submittedApplications =
        await Application.countDocuments({
          applicationStatus:
            "Submitted",
        });

      const approvedApplications =
        await Application.countDocuments({
          applicationStatus:
            "Approved",
        });

      const rejectedApplications =
        await Application.countDocuments({
          applicationStatus:
            "Rejected",
        });

      const paidApplications =
        await Application.countDocuments({
          paymentStatus:
            "Paid",
        });

      const pendingPayments =
        await Application.countDocuments({
          paymentStatus:
            "Pending",
        });

      const revenue =
        paidApplications * 2;

      return res.json({
        success: true,

        stats: {
          totalApplications,
          submittedApplications,
          approvedApplications,
          rejectedApplications,
          paidApplications,
          pendingPayments,
          revenue,
        },
      });

    } catch (error) {
      console.error(
        "DASHBOARD STATS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };