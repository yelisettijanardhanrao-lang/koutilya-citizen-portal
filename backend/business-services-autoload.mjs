import express from 'express';
import { getDb, mutate, id, now } from './portal-db.js';

if (!express.application.__ksplBusinessServicesPatched) {
  const originalListen = express.application.listen;

  express.application.listen = function (...args) {
    const app = this;
    if (!app.__ksplBusinessServicesMounted) {
      app.__ksplBusinessServicesMounted = true;

      const sessionUser = async (req) => {
        const raw = String(req.headers.cookie || '');
        const cookie = raw.split(';').map(x => x.trim()).find(x => x.startsWith('kspl_session='));
        const cookieToken = cookie ? decodeURIComponent(cookie.slice('kspl_session='.length)) : '';
        const auth = String(req.headers.authorization || '');
        const bearer = /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, '').trim() : '';
        const token = bearer || cookieToken;
        if (!token) return null;
        const db = await getDb();
        const s = db.sessions.find(x => x.token === token && x.expiresAt > Date.now());
        return s ? db.users.find(u => u.id === s.userId && u.active) : null;
      };

      app.post('/api/business-services/charge', async (req, res) => {
        try {
          const user = await sessionUser(req);
          if (!user) return res.status(401).json({ success:false, message:'Please login.' });
          if (user.mustChangePassword) return res.status(403).json({ success:false, code:'PASSWORD_CHANGE_REQUIRED', message:'Please change your temporary password before using citizen services.' });

          const serviceId = String(req.body?.serviceId || '').trim();
          const serviceName = String(req.body?.serviceName || '').trim();
          const amount = Number(req.body?.amount);
          if (!serviceId || !serviceName || !Number.isFinite(amount) || amount < 1 || amount > 10000)
            return res.status(400).json({ success:false, message:'Invalid business service payment.' });

          const result = await mutate(db => {
            const u = db.users.find(x => x.id === user.id && x.active);
            if (!u) throw Object.assign(new Error('User not found.'), { status:404 });
            const before = Number(u.walletBalance || 0);
            if (before < amount) throw Object.assign(new Error(`Insufficient wallet balance. Please add ₹${(amount-before).toFixed(2)} to continue.`), { status:402 });
            u.walletBalance = Number((before - amount).toFixed(2));
            const reference = `BS-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
            db.transactions.push({
              id:id('txn'), userId:u.id, type:'service', direction:'debit', amount:Number(amount.toFixed(2)),
              balanceBefore:before, balanceAfter:u.walletBalance, serviceId, serviceName, reference,
              providerReference:reference, status:'SUCCESS', description:`Business Services - ${serviceName}`, createdAt:now()
            });
            db.applications.push({ id:id('app'), userId:u.id, userIdDisplay:u.userId, serviceKey:`business:${serviceId}`, serviceName, createdAt:now(), data:req.body?.documentData || {} });
            return { walletBalance:u.walletBalance, reference };
          });
          res.json({ success:true, ...result, message:'Payment successful.' });
        } catch (e) {
          console.error('BUSINESS SERVICE CHARGE ERROR:', e);
          res.status(Number(e.status) || 500).json({ success:false, message:e.message || 'Unable to process service payment.' });
        }
      });
    }
    return originalListen.apply(app, args);
  };

  express.application.__ksplBusinessServicesPatched = true;
}
