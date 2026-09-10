const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();
router.use(authMiddleware);

// Atomic wallet debit for Business Services.
// Uses MongoDB findOneAndUpdate so two simultaneous requests cannot spend
// the same balance. No existing wallet top-up/payment code is modified.
router.post('/charge', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const amount = Number(req.body?.amount);
    const serviceName = String(req.body?.serviceName || '').trim();
    const serviceId = String(req.body?.serviceId || '').trim();

    if (!serviceId || !serviceName || !Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      return res.status(400).json({ success:false, message:'Invalid Business Services payment.' });
    }

    let result;
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        { _id:req.user.id, walletBalance:{ $gte:amount } },
        { $inc:{ walletBalance:-amount } },
        { new:true, session }
      ).lean();

      if (!user) {
        const existing = await User.findById(req.user.id).select('walletBalance').lean();
        if (!existing) throw Object.assign(new Error('User account not found.'), { statusCode:404 });
        throw Object.assign(new Error('Insufficient wallet balance.'), { statusCode:400 });
      }

      const balanceAfter = Number(user.walletBalance || 0);
      const balanceBefore = balanceAfter + amount;
      const reference = `BS-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

      await Transaction.create([{
        userId:user._id,
        type:'debit',
        amount,
        balanceBefore,
        balanceAfter,
        serviceName,
        reference,
        providerReference:reference,
        status:'Success',
        description:`Business Services - ${serviceName}`
      }], { session });

      result = { walletBalance:balanceAfter, reference };
    });

    return res.json({ success:true, ...result, message:'Payment successful.' });
  } catch (error) {
    console.error('BUSINESS SERVICES CHARGE ERROR:', error);
    return res.status(error.statusCode || 500).json({ success:false, message:error.message || 'Unable to process payment.' });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
