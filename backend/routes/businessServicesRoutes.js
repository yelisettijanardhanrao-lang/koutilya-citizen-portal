import express from 'express';
import { mutate, id, now } from '../portal-db.js';

const router = express.Router();

// Uses the same portal wallet database/ledger as the existing citizen portal.
// This avoids introducing a second, incompatible Mongoose wallet system.
export function registerBusinessServicesRoutes(app, requireUser, requireChangedPassword) {
  router.post('/charge', requireUser, requireChangedPassword, async (req, res) => {
    try {
      const amount = Number(req.body?.amount);
      const serviceId = String(req.body?.serviceId || '').trim();
      const serviceName = String(req.body?.serviceName || '').trim();

      if (!serviceId || !serviceName || !Number.isFinite(amount) || amount <= 0 || amount > 10000) {
        return res.status(400).json({ success:false, message:'Invalid Business Services payment.' });
      }

      const result = await mutate(db => {
        const user = db.users.find(u => u.id === req.user.id && u.active);
        if (!user) throw Object.assign(new Error('User account not found.'), { statusCode:404 });

        const balanceBefore = Number(user.walletBalance || 0);
        if (balanceBefore < amount) {
          throw Object.assign(new Error('Insufficient wallet balance.'), { statusCode:400, code:'INSUFFICIENT_BALANCE' });
        }

        const balanceAfter = Number((balanceBefore - amount).toFixed(2));
        user.walletBalance = balanceAfter;

        const reference = `BS-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
        db.transactions.push({
          id:id('txn'),
          userId:user.id,
          type:'debit',
          amount,
          balanceBefore,
          balanceAfter,
          service:serviceId,
          serviceName,
          reference,
          status:'Success',
          description:`Business Services - ${serviceName}`,
          createdAt:now()
        });

        return { walletBalance:balanceAfter, reference };
      });

      return res.json({ success:true, ...result, message:'Payment successful.' });
    } catch (error) {
      console.error('BUSINESS SERVICES CHARGE ERROR:', error);
      return res.status(error.statusCode || 500).json({
        success:false,
        ...(error.code ? {code:error.code} : {}),
        message:error.message || 'Unable to process payment.'
      });
    }
  });

  app.use('/api/business-services', router);
}
