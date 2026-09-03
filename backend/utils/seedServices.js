const Service = require("../models/Service");

const DEFAULT_SERVICES = [
  { code: "CURRENT_ADANGAL", name: "Current Adangal", description: "Application for Current Adangal.", category: "Revenue", fee: 2, icon: "📄", route: "/current-adangal" },
  { code: "INCOME_CERTIFICATE", name: "Income Certificate", description: "Application for Income Certificate.", category: "Revenue", fee: 2, icon: "💰", route: "/income-certificate" },
  { code: "LATE_BIRTH", name: "Late Registration of Birth Certificate", description: "Application for Late Registration of Birth.", category: "Birth & Death", fee: 2, icon: "👶", route: "/birth-certificate" },
  { code: "LATE_DEATH", name: "Late Registration of Death Certificate", description: "Application for Late Registration of Death.", category: "Birth & Death", fee: 2, icon: "📜", route: "/death-certificate" },
  { code: "CASTE_INTEGRATED", name: "Caste & Integrated Certificate", description: "Application for Caste / Integrated Certificate.", category: "Certificates", fee: 2, icon: "📋", route: "/caste-integrated" },
  { code: "EWS_INCOME_ASSET", name: "EWS Income & Asset Certificate", description: "Application for Economically Weaker Section Income & Asset Certificate.", category: "Certificates", fee: 2, icon: "📑", route: "/ews-certificate" },
  { code: "FAMILY_MEMBER", name: "Family Member Certificate", description: "Application for Family Member Certificate.", category: "Certificates", fee: 2, icon: "👨‍👩‍👧‍👦", route: "/family-member-certificate" },
  { code: "OBC_CERTIFICATE", name: "OBC Certificate", description: "Application for Other Backward Classes Certificate.", category: "Certificates", fee: 2, icon: "📃", route: "/obc-certificate" },
  { code: "PAN_APPLICATION", name: "PAN Card Application / PAN सेवा दarखास्त", description: "Application for allotment of Permanent Account Number (Form 49A).", category: "Tax & Identity", fee: 2, icon: "🪪", route: "/pan-application" },
];

async function seedServices() {
  for (const service of DEFAULT_SERVICES) {
    await Service.updateOne(
      { code: service.code },
      { $setOnInsert: service },
      { upsert: true }
    );
  }
}

module.exports = { seedServices };
