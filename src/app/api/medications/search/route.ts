import { NextRequest, NextResponse } from 'next/server'

// UK common medicines list — covering most care home prescriptions
// Sourced from NHS BNF / dm+d commonly prescribed drugs
const UK_MEDICINES: Array<{
  name: string
  genericName: string
  commonDoses: string[]
  route: string
  category: string
}> = [
  // Analgesics
  { name: 'Paracetamol', genericName: 'paracetamol', commonDoses: ['500mg', '1g'], route: 'ORAL', category: 'Analgesic' },
  { name: 'Co-codamol 8/500', genericName: 'codeine + paracetamol', commonDoses: ['1 tablet', '2 tablets'], route: 'ORAL', category: 'Analgesic' },
  { name: 'Co-codamol 30/500', genericName: 'codeine + paracetamol', commonDoses: ['1 tablet', '2 tablets'], route: 'ORAL', category: 'Analgesic' },
  { name: 'Tramadol', genericName: 'tramadol hydrochloride', commonDoses: ['50mg', '100mg'], route: 'ORAL', category: 'Analgesic' },
  { name: 'Morphine Sulfate MR', genericName: 'morphine sulfate', commonDoses: ['5mg', '10mg', '15mg', '20mg', '30mg'], route: 'ORAL', category: 'Analgesic (CD)' },
  { name: 'Oramorph', genericName: 'morphine sulfate oral solution', commonDoses: ['2.5mg/5ml', '5mg/5ml', '10mg/5ml'], route: 'ORAL', category: 'Analgesic (CD)' },
  { name: 'Ibuprofen', genericName: 'ibuprofen', commonDoses: ['200mg', '400mg', '600mg'], route: 'ORAL', category: 'NSAID' },
  { name: 'Naproxen', genericName: 'naproxen', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'NSAID' },
  { name: 'Diclofenac', genericName: 'diclofenac sodium', commonDoses: ['25mg', '50mg'], route: 'ORAL', category: 'NSAID' },
  { name: 'Co-dydramol', genericName: 'dihydrocodeine + paracetamol', commonDoses: ['1 tablet', '2 tablets'], route: 'ORAL', category: 'Analgesic' },
  { name: 'Gabapentin', genericName: 'gabapentin', commonDoses: ['100mg', '300mg', '400mg'], route: 'ORAL', category: 'Neuropathic' },
  { name: 'Pregabalin', genericName: 'pregabalin', commonDoses: ['25mg', '50mg', '75mg', '150mg'], route: 'ORAL', category: 'Neuropathic' },
  { name: 'Amitriptyline', genericName: 'amitriptyline hydrochloride', commonDoses: ['10mg', '25mg', '50mg'], route: 'ORAL', category: 'Neuropathic/Antidepressant' },

  // Cardiovascular
  { name: 'Amlodipine', genericName: 'amlodipine', commonDoses: ['2.5mg', '5mg', '10mg'], route: 'ORAL', category: 'Calcium Channel Blocker' },
  { name: 'Ramipril', genericName: 'ramipril', commonDoses: ['1.25mg', '2.5mg', '5mg', '10mg'], route: 'ORAL', category: 'ACE Inhibitor' },
  { name: 'Lisinopril', genericName: 'lisinopril', commonDoses: ['2.5mg', '5mg', '10mg', '20mg'], route: 'ORAL', category: 'ACE Inhibitor' },
  { name: 'Bisoprolol', genericName: 'bisoprolol fumarate', commonDoses: ['1.25mg', '2.5mg', '5mg', '10mg'], route: 'ORAL', category: 'Beta Blocker' },
  { name: 'Atenolol', genericName: 'atenolol', commonDoses: ['25mg', '50mg', '100mg'], route: 'ORAL', category: 'Beta Blocker' },
  { name: 'Metoprolol', genericName: 'metoprolol tartrate', commonDoses: ['25mg', '50mg', '100mg'], route: 'ORAL', category: 'Beta Blocker' },
  { name: 'Atorvastatin', genericName: 'atorvastatin', commonDoses: ['10mg', '20mg', '40mg', '80mg'], route: 'ORAL', category: 'Statin' },
  { name: 'Simvastatin', genericName: 'simvastatin', commonDoses: ['10mg', '20mg', '40mg'], route: 'ORAL', category: 'Statin' },
  { name: 'Rosuvastatin', genericName: 'rosuvastatin', commonDoses: ['5mg', '10mg', '20mg', '40mg'], route: 'ORAL', category: 'Statin' },
  { name: 'Furosemide', genericName: 'furosemide', commonDoses: ['20mg', '40mg', '80mg'], route: 'ORAL', category: 'Loop Diuretic' },
  { name: 'Bendroflumethiazide', genericName: 'bendroflumethiazide', commonDoses: ['2.5mg'], route: 'ORAL', category: 'Thiazide Diuretic' },
  { name: 'Spironolactone', genericName: 'spironolactone', commonDoses: ['25mg', '50mg', '100mg'], route: 'ORAL', category: 'Potassium-sparing Diuretic' },
  { name: 'Digoxin', genericName: 'digoxin', commonDoses: ['62.5 micrograms', '125 micrograms', '250 micrograms'], route: 'ORAL', category: 'Cardiac Glycoside' },
  { name: 'Warfarin', genericName: 'warfarin sodium', commonDoses: ['0.5mg', '1mg', '3mg', '5mg'], route: 'ORAL', category: 'Anticoagulant (CD variable)' },
  { name: 'Apixaban', genericName: 'apixaban', commonDoses: ['2.5mg', '5mg'], route: 'ORAL', category: 'Anticoagulant (DOAC)' },
  { name: 'Rivaroxaban', genericName: 'rivaroxaban', commonDoses: ['10mg', '15mg', '20mg'], route: 'ORAL', category: 'Anticoagulant (DOAC)' },
  { name: 'Edoxaban', genericName: 'edoxaban', commonDoses: ['30mg', '60mg'], route: 'ORAL', category: 'Anticoagulant (DOAC)' },
  { name: 'Aspirin', genericName: 'aspirin', commonDoses: ['75mg', '300mg'], route: 'ORAL', category: 'Antiplatelet' },
  { name: 'Clopidogrel', genericName: 'clopidogrel', commonDoses: ['75mg'], route: 'ORAL', category: 'Antiplatelet' },
  { name: 'Isosorbide Mononitrate', genericName: 'isosorbide mononitrate', commonDoses: ['10mg', '20mg', '40mg', '60mg'], route: 'ORAL', category: 'Nitrate' },
  { name: 'GTN Spray', genericName: 'glyceryl trinitrate', commonDoses: ['400 micrograms/dose'], route: 'SUBLINGUAL', category: 'Nitrate (PRN)' },

  // Respiratory
  { name: 'Salbutamol Inhaler', genericName: 'salbutamol', commonDoses: ['100 micrograms/dose'], route: 'INHALED', category: 'Bronchodilator (PRN)' },
  { name: 'Salbutamol Nebuliser', genericName: 'salbutamol', commonDoses: ['2.5mg/2.5ml', '5mg/2.5ml'], route: 'INHALED', category: 'Bronchodilator (PRN)' },
  { name: 'Salmeterol', genericName: 'salmeterol', commonDoses: ['25 micrograms', '50 micrograms'], route: 'INHALED', category: 'LABA' },
  { name: 'Tiotropium', genericName: 'tiotropium', commonDoses: ['18 micrograms'], route: 'INHALED', category: 'LAMA' },
  { name: 'Ipratropium', genericName: 'ipratropium bromide', commonDoses: ['20 micrograms/dose'], route: 'INHALED', category: 'Bronchodilator' },
  { name: 'Beclometasone Inhaler', genericName: 'beclometasone dipropionate', commonDoses: ['50 micrograms', '100 micrograms', '200 micrograms'], route: 'INHALED', category: 'Corticosteroid (inhaled)' },
  { name: 'Fluticasone Inhaler', genericName: 'fluticasone propionate', commonDoses: ['50 micrograms', '125 micrograms', '250 micrograms'], route: 'INHALED', category: 'Corticosteroid (inhaled)' },
  { name: 'Seretide', genericName: 'salmeterol + fluticasone', commonDoses: ['25/50', '25/125', '25/250'], route: 'INHALED', category: 'Combination (LABA+ICS)' },
  { name: 'Symbicort', genericName: 'budesonide + formoterol', commonDoses: ['100/6', '200/6'], route: 'INHALED', category: 'Combination (LABA+ICS)' },
  { name: 'Prednisolone', genericName: 'prednisolone', commonDoses: ['1mg', '5mg', '10mg', '20mg', '25mg'], route: 'ORAL', category: 'Corticosteroid' },

  // Diabetes
  { name: 'Metformin', genericName: 'metformin hydrochloride', commonDoses: ['500mg', '850mg', '1g'], route: 'ORAL', category: 'Biguanide' },
  { name: 'Gliclazide', genericName: 'gliclazide', commonDoses: ['40mg', '80mg', '160mg'], route: 'ORAL', category: 'Sulfonylurea' },
  { name: 'Glipizide', genericName: 'glipizide', commonDoses: ['2.5mg', '5mg'], route: 'ORAL', category: 'Sulfonylurea' },
  { name: 'Sitagliptin', genericName: 'sitagliptin', commonDoses: ['25mg', '50mg', '100mg'], route: 'ORAL', category: 'DPP-4 Inhibitor' },
  { name: 'Empagliflozin', genericName: 'empagliflozin', commonDoses: ['10mg', '25mg'], route: 'ORAL', category: 'SGLT2 Inhibitor' },
  { name: 'Dapagliflozin', genericName: 'dapagliflozin', commonDoses: ['10mg'], route: 'ORAL', category: 'SGLT2 Inhibitor' },
  { name: 'Insulin Glargine (Lantus)', genericName: 'insulin glargine', commonDoses: ['variable units'], route: 'SUBCUTANEOUS', category: 'Insulin (basal)' },
  { name: 'Insulin Detemir (Levemir)', genericName: 'insulin detemir', commonDoses: ['variable units'], route: 'SUBCUTANEOUS', category: 'Insulin (basal)' },
  { name: 'NovoRapid', genericName: 'insulin aspart', commonDoses: ['variable units'], route: 'SUBCUTANEOUS', category: 'Insulin (bolus)' },
  { name: 'Humalog', genericName: 'insulin lispro', commonDoses: ['variable units'], route: 'SUBCUTANEOUS', category: 'Insulin (bolus)' },
  { name: 'Humulin M3', genericName: 'biphasic isophane insulin', commonDoses: ['variable units'], route: 'SUBCUTANEOUS', category: 'Insulin (mixed)' },

  // Mental Health / Neuro
  { name: 'Donepezil', genericName: 'donepezil hydrochloride', commonDoses: ['5mg', '10mg'], route: 'ORAL', category: 'Dementia (AChE inhibitor)' },
  { name: 'Rivastigmine', genericName: 'rivastigmine', commonDoses: ['1.5mg', '3mg', '4.5mg', '6mg'], route: 'ORAL', category: 'Dementia (AChE inhibitor)' },
  { name: 'Memantine', genericName: 'memantine hydrochloride', commonDoses: ['5mg', '10mg', '15mg', '20mg'], route: 'ORAL', category: 'Dementia (NMDA antagonist)' },
  { name: 'Haloperidol', genericName: 'haloperidol', commonDoses: ['500 micrograms', '1mg', '5mg'], route: 'ORAL', category: 'Antipsychotic' },
  { name: 'Risperidone', genericName: 'risperidone', commonDoses: ['0.5mg', '1mg', '2mg'], route: 'ORAL', category: 'Antipsychotic' },
  { name: 'Quetiapine', genericName: 'quetiapine', commonDoses: ['25mg', '50mg', '100mg', '150mg', '200mg'], route: 'ORAL', category: 'Antipsychotic' },
  { name: 'Olanzapine', genericName: 'olanzapine', commonDoses: ['2.5mg', '5mg', '10mg'], route: 'ORAL', category: 'Antipsychotic' },
  { name: 'Sertraline', genericName: 'sertraline hydrochloride', commonDoses: ['50mg', '100mg'], route: 'ORAL', category: 'SSRI' },
  { name: 'Citalopram', genericName: 'citalopram hydrobromide', commonDoses: ['10mg', '20mg', '40mg'], route: 'ORAL', category: 'SSRI' },
  { name: 'Escitalopram', genericName: 'escitalopram', commonDoses: ['5mg', '10mg', '20mg'], route: 'ORAL', category: 'SSRI' },
  { name: 'Fluoxetine', genericName: 'fluoxetine hydrochloride', commonDoses: ['20mg'], route: 'ORAL', category: 'SSRI' },
  { name: 'Mirtazapine', genericName: 'mirtazapine', commonDoses: ['15mg', '30mg', '45mg'], route: 'ORAL', category: 'Antidepressant' },
  { name: 'Venlafaxine', genericName: 'venlafaxine', commonDoses: ['37.5mg', '75mg', '150mg'], route: 'ORAL', category: 'SNRI' },
  { name: 'Lorazepam', genericName: 'lorazepam', commonDoses: ['0.5mg', '1mg', '2mg'], route: 'ORAL', category: 'Benzodiazepine (CD)' },
  { name: 'Diazepam', genericName: 'diazepam', commonDoses: ['2mg', '5mg', '10mg'], route: 'ORAL', category: 'Benzodiazepine (CD)' },
  { name: 'Zopiclone', genericName: 'zopiclone', commonDoses: ['3.75mg', '7.5mg'], route: 'ORAL', category: 'Hypnotic' },
  { name: 'Zolpidem', genericName: 'zolpidem tartrate', commonDoses: ['5mg', '10mg'], route: 'ORAL', category: 'Hypnotic' },
  { name: 'Nitrazepam', genericName: 'nitrazepam', commonDoses: ['5mg', '10mg'], route: 'ORAL', category: 'Benzodiazepine/Hypnotic (CD)' },
  { name: 'Carbamazepine', genericName: 'carbamazepine', commonDoses: ['100mg', '200mg', '400mg'], route: 'ORAL', category: 'Anticonvulsant' },
  { name: 'Sodium Valproate', genericName: 'sodium valproate', commonDoses: ['100mg', '200mg', '500mg'], route: 'ORAL', category: 'Anticonvulsant' },
  { name: 'Levetiracetam', genericName: 'levetiracetam', commonDoses: ['250mg', '500mg', '750mg', '1g'], route: 'ORAL', category: 'Anticonvulsant' },
  { name: 'Phenytoin', genericName: 'phenytoin', commonDoses: ['25mg', '50mg', '100mg'], route: 'ORAL', category: 'Anticonvulsant' },

  // GI / Bowel
  { name: 'Omeprazole', genericName: 'omeprazole', commonDoses: ['10mg', '20mg', '40mg'], route: 'ORAL', category: 'PPI' },
  { name: 'Lansoprazole', genericName: 'lansoprazole', commonDoses: ['15mg', '30mg'], route: 'ORAL', category: 'PPI' },
  { name: 'Pantoprazole', genericName: 'pantoprazole', commonDoses: ['20mg', '40mg'], route: 'ORAL', category: 'PPI' },
  { name: 'Ranitidine', genericName: 'ranitidine', commonDoses: ['150mg', '300mg'], route: 'ORAL', category: 'H2 Blocker' },
  { name: 'Laxido', genericName: 'macrogol 3350', commonDoses: ['1 sachet', '2 sachets'], route: 'ORAL', category: 'Osmotic Laxative' },
  { name: 'Movicol', genericName: 'macrogol 3350', commonDoses: ['1 sachet', '2 sachets'], route: 'ORAL', category: 'Osmotic Laxative' },
  { name: 'Lactulose', genericName: 'lactulose', commonDoses: ['5ml', '10ml', '15ml', '20ml'], route: 'ORAL', category: 'Osmotic Laxative' },
  { name: 'Senna', genericName: 'senna', commonDoses: ['7.5mg', '15mg'], route: 'ORAL', category: 'Stimulant Laxative' },
  { name: 'Bisacodyl', genericName: 'bisacodyl', commonDoses: ['5mg', '10mg'], route: 'ORAL', category: 'Stimulant Laxative' },
  { name: 'Bisacodyl Suppositories', genericName: 'bisacodyl', commonDoses: ['10mg'], route: 'RECTAL', category: 'Stimulant Laxative' },
  { name: 'Glycerol Suppositories', genericName: 'glycerol', commonDoses: ['4g'], route: 'RECTAL', category: 'Rectal Laxative' },
  { name: 'Microlax Enema', genericName: 'sodium citrate micro-enema', commonDoses: ['5ml'], route: 'RECTAL', category: 'Enema' },
  { name: 'Domperidone', genericName: 'domperidone', commonDoses: ['10mg'], route: 'ORAL', category: 'Antiemetic' },
  { name: 'Ondansetron', genericName: 'ondansetron', commonDoses: ['4mg', '8mg'], route: 'ORAL', category: 'Antiemetic' },
  { name: 'Cyclizine', genericName: 'cyclizine', commonDoses: ['50mg'], route: 'ORAL', category: 'Antiemetic' },
  { name: 'Metoclopramide', genericName: 'metoclopramide hydrochloride', commonDoses: ['10mg'], route: 'ORAL', category: 'Antiemetic/Prokinetic' },

  // Antibiotics
  { name: 'Amoxicillin', genericName: 'amoxicillin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Co-amoxiclav', genericName: 'amoxicillin + clavulanic acid', commonDoses: ['375mg', '625mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Penicillin V', genericName: 'phenoxymethylpenicillin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Cefalexin', genericName: 'cefalexin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Trimethoprim', genericName: 'trimethoprim', commonDoses: ['100mg', '200mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Nitrofurantoin', genericName: 'nitrofurantoin', commonDoses: ['50mg', '100mg'], route: 'ORAL', category: 'Antibiotic (UTI)' },
  { name: 'Doxycycline', genericName: 'doxycycline', commonDoses: ['50mg', '100mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Erythromycin', genericName: 'erythromycin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Clarithromycin', genericName: 'clarithromycin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Metronidazole', genericName: 'metronidazole', commonDoses: ['200mg', '400mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Flucloxacillin', genericName: 'flucloxacillin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },
  { name: 'Ciprofloxacin', genericName: 'ciprofloxacin', commonDoses: ['250mg', '500mg'], route: 'ORAL', category: 'Antibiotic' },

  // Skin / Topical
  { name: 'Hydrocortisone 1% Cream', genericName: 'hydrocortisone', commonDoses: ['apply thinly'], route: 'TOPICAL', category: 'Topical Corticosteroid' },
  { name: 'Betamethasone Cream 0.1%', genericName: 'betamethasone valerate', commonDoses: ['apply thinly'], route: 'TOPICAL', category: 'Topical Corticosteroid' },
  { name: 'Diprobase Cream', genericName: 'emollient cream', commonDoses: ['apply as required'], route: 'TOPICAL', category: 'Emollient' },
  { name: 'Aqueous Cream', genericName: 'aqueous cream', commonDoses: ['apply as required'], route: 'TOPICAL', category: 'Emollient' },
  { name: 'E45 Cream', genericName: 'emollient cream', commonDoses: ['apply as required'], route: 'TOPICAL', category: 'Emollient' },
  { name: 'Canesten Cream', genericName: 'clotrimazole', commonDoses: ['apply 2-3 times daily'], route: 'TOPICAL', category: 'Antifungal' },

  // Eyes / Ears
  { name: 'Timolol Eye Drops 0.25%', genericName: 'timolol maleate', commonDoses: ['1 drop'], route: 'EYE_DROP', category: 'Glaucoma' },
  { name: 'Latanoprost Eye Drops', genericName: 'latanoprost', commonDoses: ['1 drop'], route: 'EYE_DROP', category: 'Glaucoma' },
  { name: 'Chloramphenicol Eye Drops', genericName: 'chloramphenicol', commonDoses: ['1-2 drops'], route: 'EYE_DROP', category: 'Antibiotic (eye)' },
  { name: 'Hypromellose Eye Drops', genericName: 'hypromellose', commonDoses: ['1-2 drops'], route: 'EYE_DROP', category: 'Dry eye / lubricant' },
  { name: 'Sodium Chloride Nasal Spray', genericName: 'sodium chloride 0.9%', commonDoses: ['1-2 sprays'], route: 'NASAL', category: 'Nasal' },
  { name: 'Olive Oil Ear Drops', genericName: 'olive oil', commonDoses: ['2-3 drops'], route: 'EAR_DROP', category: 'Ear' },

  // Vitamins / Supplements
  { name: 'Vitamin D3', genericName: 'colecalciferol', commonDoses: ['400 units', '800 units', '1000 units', '20000 units', '40000 units'], route: 'ORAL', category: 'Vitamin' },
  { name: 'Calcium + Vitamin D', genericName: 'calcium carbonate + colecalciferol', commonDoses: ['1 tablet', '2 tablets'], route: 'ORAL', category: 'Calcium/Vitamin D' },
  { name: 'Ferrous Sulphate', genericName: 'ferrous sulfate', commonDoses: ['200mg'], route: 'ORAL', category: 'Iron Supplement' },
  { name: 'Ferrous Fumarate', genericName: 'ferrous fumarate', commonDoses: ['210mg'], route: 'ORAL', category: 'Iron Supplement' },
  { name: 'Folic Acid', genericName: 'folic acid', commonDoses: ['400 micrograms', '5mg'], route: 'ORAL', category: 'Vitamin B9' },
  { name: 'Vitamin B12', genericName: 'cyanocobalamin', commonDoses: ['50 micrograms', '1mg'], route: 'ORAL', category: 'Vitamin B12' },
  { name: 'Thiamine', genericName: 'thiamine hydrochloride', commonDoses: ['25mg', '50mg', '100mg'], route: 'ORAL', category: 'Vitamin B1' },
  { name: 'Magnesium Glycerophosphate', genericName: 'magnesium glycerophosphate', commonDoses: ['97.2mg', '4mmol'], route: 'ORAL', category: 'Mineral' },

  // Thyroid / Hormones
  { name: 'Levothyroxine', genericName: 'levothyroxine sodium', commonDoses: ['25 micrograms', '50 micrograms', '75 micrograms', '100 micrograms', '125 micrograms', '150 micrograms'], route: 'ORAL', category: 'Thyroid' },
  { name: 'Allopurinol', genericName: 'allopurinol', commonDoses: ['100mg', '300mg'], route: 'ORAL', category: 'Gout' },
  { name: 'Colchicine', genericName: 'colchicine', commonDoses: ['500 micrograms'], route: 'ORAL', category: 'Gout' },

  // Urinary
  { name: 'Tamsulosin', genericName: 'tamsulosin hydrochloride', commonDoses: ['400 micrograms'], route: 'ORAL', category: 'Alpha Blocker (BPH)' },
  { name: 'Finasteride', genericName: 'finasteride', commonDoses: ['5mg'], route: 'ORAL', category: 'BPH / Hair loss' },
  { name: 'Oxybutynin', genericName: 'oxybutynin hydrochloride', commonDoses: ['2.5mg', '5mg'], route: 'ORAL', category: 'Bladder (anticholinergic)' },
  { name: 'Solifenacin', genericName: 'solifenacin succinate', commonDoses: ['5mg', '10mg'], route: 'ORAL', category: 'Bladder (anticholinergic)' },

  // Patches / Transdermal
  { name: 'Buprenorphine Patch (BuTrans)', genericName: 'buprenorphine', commonDoses: ['5 micrograms/hour', '10 micrograms/hour', '20 micrograms/hour'], route: 'TRANSDERMAL', category: 'Analgesic (CD)' },
  { name: 'Fentanyl Patch', genericName: 'fentanyl', commonDoses: ['12 micrograms/hour', '25 micrograms/hour', '50 micrograms/hour'], route: 'TRANSDERMAL', category: 'Analgesic (CD)' },
  { name: 'Rivastigmine Patch', genericName: 'rivastigmine', commonDoses: ['4.6mg/24h', '9.5mg/24h', '13.3mg/24h'], route: 'TRANSDERMAL', category: 'Dementia' },
  { name: 'GTN Patch', genericName: 'glyceryl trinitrate', commonDoses: ['5mg/24h', '10mg/24h'], route: 'TRANSDERMAL', category: 'Nitrate' },
]

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase()
  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const results = UK_MEDICINES.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
  )
    .slice(0, 12)
    .map((m) => ({
      name: m.name,
      genericName: m.genericName,
      commonDoses: m.commonDoses,
      route: m.route,
      category: m.category,
    }))

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
