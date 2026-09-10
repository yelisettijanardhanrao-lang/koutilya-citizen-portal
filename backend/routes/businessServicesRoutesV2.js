import { mutate, id, now } from '../portal-db.js';

export default function registerBusinessServicesRoutes(app, requireUser, requireChangedPassword){
  app.post('/api/business-services/charge', requireUser, requireChangedPassword, async (req,res)=>{
    try{
      const serviceId=String(req.body?.serviceId||'').trim();
      const serviceName=String(req.body?.serviceName||'').trim();
      const amount=Number(req.body?.amount);
      if(!serviceId||!serviceName||!Number.isFinite(amount)||amount<1||amount>10000)
        return res.status(400).json({success:false,message:'Invalid business service payment.'});
      const result=await mutate(db=>{
        const user=db.users.find(u=>u.id===req.user.id&&u.active);
        if(!user) throw Object.assign(new Error('User not found.'),{status:404});
        const before=Number(user.walletBalance||0);
        if(before<amount) throw Object.assign(new Error(`Insufficient wallet balance. Please add ₹${(amount-before).toFixed(2)} to continue.`),{status:402});
        user.walletBalance=Number((before-amount).toFixed(2));
        const reference=`BS-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
        db.transactions.push({id:id('tx'),userId:user.id,type:'service',amount:Number(amount.toFixed(2)),balanceBefore:before,balanceAfter:user.walletBalance,serviceId,serviceName,reference,providerReference:reference,status:'Success',description:`Business Services - ${serviceName}`,createdAt:now()});
        return {walletBalance:user.walletBalance,reference};
      });
      res.json({success:true,...result,message:'Payment successful.'});
    }catch(e){
      console.error('BUSINESS SERVICE CHARGE ERROR:',e);
      res.status(Number(e.status)||500).json({success:false,message:e.message||'Unable to process service payment.'});
    }
  });
}
