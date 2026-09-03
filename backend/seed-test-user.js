import { mutate, getDb, id, hashPassword, now } from './portal-db.js';
const userId='KSPL3412';
const password='KSPL@1234';
await mutate(db=>{
  let u=db.users.find(x=>x.userId===userId);
  if(!u){u={id:id('usr'),userId,name:'Demo Citizen',mobile:'9999999999',email:'demo@example.com',city:'Rajahmundry',passwordHash:hashPassword(password),mustChangePassword:true,walletBalance:100,pdfEntitlements:[],active:true,createdAt:now()};db.users.push(u);}
  else {u.passwordHash=hashPassword(password);u.mustChangePassword=true;u.walletBalance=100;u.active=true;}
});
console.log('Test citizen ready');console.log('User ID:',userId);console.log('Temporary Password:',password);console.log('Wallet: ₹100');
