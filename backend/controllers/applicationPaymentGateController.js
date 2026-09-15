const mongoose = require('mongoose');
const Application = require('../models/Application');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const generatePDF = require('../utils/generatePDF');

// Submit step: charge ₹2 from the authenticated citizen wallet only.
// PDF generation is intentionally NOT performed here.
exports.submitAndCharge = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({success:false,message:'Invalid application ID.'});
    const application = await Application.findById(id);
    if (!application) return res.status(404).json({success:false,message:'Application not found.'});
    if (req.user?.role !== 'admin' && String(application.userId) !== String(req.user?.id)) return res.status(403).json({success:false,message:'You are not allowed to submit this application.'});
    if (application.paymentStatus === 'Paid') return res.json({success:true,message:'Payment already completed.',walletBalance:null,application});

    const amount = 2;
    const payer = await User.findById(application.userId);
    if (!payer) return res.status(404).json({success:false,message:'Application owner was not found.'});
    const balanceBefore = Number(payer.walletBalance || 0);
    if (balanceBefore < amount) return res.status(400).json({success:false,message:`Insufficient wallet balance. Required ₹${amount.toFixed(2)}, available ₹${balanceBefore.toFixed(2)}.`,walletBalance:balanceBefore});

    const updated = await User.findOneAndUpdate({_id:payer._id,walletBalance:{$gte:amount}},{$inc:{walletBalance:-amount}},{new:true});
    if (!updated) return res.status(400).json({success:false,message:'Wallet balance changed. Please try Submit again.'});
    const balanceAfter = Number(updated.walletBalance || 0);
    const paymentReference = `APP-${Date.now()}-${String(application._id).slice(-6)}`;

    application.paymentAmount = amount;
    application.paymentStatus = 'Paid';
    application.paymentId = paymentReference;
    application.applicationStatus = 'Submitted';
    await application.save();

    await Transaction.create({userId:payer._id,type:'debit',amount,balanceBefore,balanceAfter,serviceName:application.service,reference:paymentReference,status:'Success',description:`Application submission fee for ${application.applicationNumber}`,applicationId:application._id,applicationNumber:application.applicationNumber,createdBy:req.user?.id || null});

    return res.json({success:true,message:'₹2 deducted successfully. Generate PDF is now available.',walletBalance:balanceAfter,application});
  } catch (error) {
    console.error('APPLICATION SUBMIT PAYMENT ERROR:',error);
    return res.status(500).json({success:false,message:error.message || 'Application payment failed.'});
  }
};

// Generate step: allowed only after successful ₹2 payment.
exports.generatePaidPdf = async (req,res) => {
  try {
    const id=req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({success:false,message:'Invalid application ID.'});
    const application=await Application.findById(id);
    if(!application) return res.status(404).json({success:false,message:'Application not found.'});
    if(req.user?.role !== 'admin' && String(application.userId)!==String(req.user?.id)) return res.status(403).json({success:false,message:'You are not allowed to generate this PDF.'});
    if(application.paymentStatus !== 'Paid') return res.status(402).json({success:false,message:'Payment is required before PDF generation.'});
    if(!application.pdfUrl){
      const pdfUrl=await generatePDF(application);
      if(!pdfUrl) throw new Error('PDF generator returned an empty URL.');
      application.pdfUrl=pdfUrl;
      application.pdfGeneratedAt=new Date();
      await application.save();
    }
    return res.json({success:true,message:'PDF generated successfully.',pdfUrl:application.pdfUrl,application});
  }catch(error){
    console.error('PAID PDF GENERATION ERROR:',error);
    return res.status(500).json({success:false,message:error.message || 'PDF generation failed.'});
  }
};
