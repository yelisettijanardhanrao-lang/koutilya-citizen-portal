// Rules are deliberately separated from rendering.  These are preparation rules,
// not legal advice.  Authority-specific entries are only stated where the current
// official source has been verified; otherwise the system tells the citizen to use
// the receiving authority's current requirements.

const uniq = a => [...new Set((a || []).filter(Boolean))];

const SOURCES = {
  uidaiFaq: 'https://uidai.gov.in/en/297-faqs/enrolment-update',
  uidaiGazette: 'https://uidai.gov.in/en/gazetted-notifications',
  passportAdvisor: 'https://services1.passportindia.gov.in/psp/docAdvisor/reissuePassport',
  passportManual: 'https://www.passportindia.gov.in/AppOnlineProject/pdf/Passport_Manual_16_Chapters_to_be_disclosed.pdf',
  apRevenue: 'https://krishna.ap.gov.in/service/revenue-services/',
  apLateDeath: 'https://ntr.ap.gov.in/service/death-certificate/',
  telanganaServices: 'https://www.telangana.gov.in/services/state-services/'
};

function authority(service, jurisdiction='', authorityChoice='') {
  const text = `${service.departments?.join(' ')||''} ${service.title||''}`.toLowerCase();
  const choice = String(authorityChoice||'').toLowerCase();
  const j = String(jurisdiction||'').toLowerCase();
  if (/uidai|aadhaar/.test(choice)) return 'uidai';
  if (/passport/.test(choice)) return 'passport';
  if (/pan|income tax/.test(choice)) return 'pan';
  if (/andhra|state \/ local/.test(choice) && j.includes('andhra pradesh')) return 'ap';
  if (/telangana|state \/ local/.test(choice) && j.includes('telangana')) return 'telangana';
  if (/uidai|aadhaar/.test(text)) return 'uidai';
  if (/passport/.test(text)) return 'passport';
  if (/pan|income tax/.test(text)) return 'pan';
  if (j.includes('andhra pradesh') || /andhra pradesh/.test(text)) return 'ap';
  if (j.includes('telangana') || /telangana/.test(text)) return 'telangana';
  return 'general';
}

export function decideAffidavit(service, {caseType='', jurisdiction='', authorityChoice=''}={}) {
  const a = authority(service, jurisdiction, authorityChoice);
  const id = service.id;
  let documents = [...(service.checklist || [])];
  let outputs = ['Service-specific affidavit / declaration draft'];
  let steps = [
    'Check the original records and enter names, dates and numbers exactly as they appear.',
    'Print the generated document and sign only after checking every statement.',
    'Complete any required notarisation / attestation before submission.',
    'Carry the originals and self-attested copies of the supporting records listed by the receiving authority.'
  ];
  let warnings = [...(service.notes || [])];
  let officialReferences = [];
  let officialFormat = false;
  let documentRequired = true;
  let matterTemplate = String(service.matter_template || '').trim();

  if (id === 'name-change') {
    outputs = ['Name-change affidavit / supporting declaration draft'];
    if (a === 'uidai') {
      documents.push('Gazette notification for first/full name change, where UIDAI requires it');
      documents.push('Old POI containing the name currently recorded in Aadhaar');
      steps.push('For a first/full Aadhaar name change, carry the Gazette notification and old POI; the Gazette address should match Aadhaar.');
      warnings.push('If this is a name update beyond the permitted limit, UIDAI has an exception-processing route after the update is rejected for limit exceeded.');
      officialReferences.push(SOURCES.uidaiFaq, SOURCES.uidaiGazette);
      if (/first\s*\/\s*full/i.test(caseType)) {
        documentRequired = false;
        outputs = ['No affidavit is indicated by current UIDAI guidance for this route', 'UIDAI name-change preparation checklist'];
        warnings.push('Do not generate or execute an unnecessary affidavit for this UIDAI route. Follow the Gazette and UIDAI document requirements instead.');
      }
    } else if (a === 'passport') {
      documents.push('Current Passport Seva prescribed Deed Poll / Sworn Affidavit route, where applicable');
      documents.push('Newspaper clippings or Gazette notification, where required for the selected name-change route');
      documents.push('At least two public/school documents in the changed name where Passport Seva requires them');
      steps.push('Use the current Passport Seva document advisor for the exact reissue/name-change route.');
      officialReferences.push(SOURCES.passportAdvisor, SOURCES.passportManual);
      if (/first\s*\/\s*full|substantial|complete/i.test(caseType)) {
        matterTemplate = 'I, {{1}}, previously known as {{0}}, engaged in {{10}} and residing at {{5}}, solemnly declare that I have changed my name from {{0}} to {{1}}. I renounce the use of my former name and shall hereafter use and sign the name {{1}} in my records, deeds, writings, dealings and transactions. I request that the changed name be recognized for the stated passport purpose, subject to the current Passport Seva procedure and supporting documents. I have made this declaration voluntarily and the particulars stated herein are true and correct.';
        outputs = ['Passport name-change Deed Poll / Sworn Affidavit draft', 'Passport Seva submission checklist'];
        officialFormat = true;
      }
    } else {
      documents.push('Current identity proof and the record containing the old name');
      documents.push('Proof supporting the proposed/new name, if already available');
      warnings.push('Gazette, newspaper publication, marriage/divorce/adoption evidence or a court order may apply only to particular cases and authorities. Do not assume one route applies to every name change.');
      if (a === 'telangana') {
        documents.push('Telangana Change of Name Application Form and prescribed supporting records');
        documents.push('Affidavit stating the exact reason for the proposed name change');
        documents.push('Recent passport-size photograph and other identity/citizenship records specified by the Telangana form');
        officialReferences.push('https://www.telangana.gov.in/wp-content/uploads/2023/03/ChangeofNameApplicationForm-1.pdf');
        matterTemplate = 'I, {{0}}, son/daughter/spouse/guardian of {{3}}, aged as declared, residing at {{5}}, do hereby solemnly affirm and state that my present name is {{0}} and that I propose to use the name {{1}}. The exact reason for the proposed change is {{2}}. The change is connected with {{8}} and is required for {{9}}. My existing name is supported by {{6}}, and any document already showing the proposed name is {{7}}. I request the competent authority to consider this affidavit together with the prescribed Change of Name application and supporting records. I declare that the particulars stated above are true and correct to the best of my knowledge and belief.';
      }
    }
  }

  if (id === 'lost-passport' || a === 'passport' && /lost|damaged/.test(id)) {
    documents.push('Police report / loss report as required by Passport Seva');
    documents.push('Current Passport Seva Annexure F where applicable');
    outputs = ['Passport loss/damage supporting declaration draft', 'Passport Seva submission checklist'];
    steps.push('Use the current Passport Seva prescribed annexure when the authority requires it; this draft does not replace that annexure.');
    officialReferences.push(SOURCES.passportAdvisor, SOURCES.passportManual);
    officialFormat = true;
  }

  if (id === 'minor-passport-parent') {
    documents.push('Parent/guardian identity and relationship documents');
    documents.push('Current Passport Seva Annexure C/D/I, whichever matches the minor case');
    outputs = ['Minor-passport supporting declaration draft', 'Passport Seva annexure checklist'];
    officialReferences.push(SOURCES.passportManual, SOURCES.passportAdvisor);
    officialFormat = true;
  }

  if (id === 'family-member' && a === 'ap') {
    documents.push('Death Certificate / FIR as applicable');
    documents.push('Relationship proof such as ration card, voter ID, passport, passbook or Aadhaar, as applicable');
    documents.push('Notarized affidavit containing deceased person details, applicant relationship and family-member particulars');
    outputs = ['Family Member Certificate affidavit draft', 'AP submission checklist'];
    officialReferences.push(SOURCES.apRevenue);
  }

  if (id === 'late-death-registration' && a === 'ap') {
    documents.push('Non-availability certificate from Gram Panchayat / Municipal Administration');
    documents.push('Ration card copy');
    documents.push('Self affidavit');
    outputs = ['Late death registration affidavit package'];
    officialReferences.push(SOURCES.apLateDeath, SOURCES.apRevenue);
  }

  if (id === 'aadhaar-name-difference' || a === 'uidai' && /name|difference/.test(id)) {
    documents.push('Identity/POI records supporting the requested Aadhaar name');
    warnings.push('Aadhaar updates are governed by UIDAI document and update-limit rules; an affidavit alone does not guarantee an Aadhaar update.');
    officialReferences.push(SOURCES.uidaiFaq);
  }

  if (id === 'pan-name-difference' || a === 'pan') {
    documents.push('PAN record and the identity/name proof supporting the correction');
    warnings.push('PAN correction acceptance is controlled by the current Income Tax/PAN service provider requirements; this declaration is not a substitute for the prescribed PAN application/correction form.');
  }

  if (/minor|guardian|parent-consent/.test(id)) {
    documents.push('Parent/guardian identity and relationship proof');
  }
  if (/family-member|legal-heir|no-other-heir|bank-deceased|insurance-claim|pension-family/.test(id)) {
    documents.push('Death certificate and relationship/heirship records, where applicable');
    warnings.push('This document does not replace a succession certificate, probate, letters of administration or court order when one is legally required.');
  }
  if (/lost|vehicle-loss|police-loss/.test(id)) {
    documents.push('Police complaint / loss report or other authority record, where applicable');
  }

  return {
    decisionMode: 'rules',
    authority: a,
    caseType,
    jurisdiction,
    outputs: uniq(outputs),
    checklist: uniq(documents),
    steps: uniq(steps),
    warnings: uniq(warnings),
    officialReferences: uniq(officialReferences),
    officialFormat,
    documentRequired,
    matterTemplate,
    verified: officialReferences.length > 0,
    verification: service.verification || {status:'review-required'}
  };
}
