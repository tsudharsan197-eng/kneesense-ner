// Static label strings for the PDF screening report, kept separate from
// src/i18n because a couple of labels are worded more formally here than
// their UI equivalents (e.g. "Minimum angle" vs the UI's "Min angle").
import type { Language } from '../types/models';
import type { RiskCategory } from '../types/models';

export interface ReportStrings {
  title: string;
  patientId: string;
  date: string;
  ageGroup: string;
  location: string;
  kneeTested: string;
  previousInjury: string;
  yes: string;
  no: string;
  notRecorded: string;
  notPerformed: string;
  notPerformedSkippedSafety: string;
  notPerformedCameraOnly: string;
  status: string;
  difficultyLabels: [string, string, string, string];

  symptomsSection: string;
  avgPainScore: string;
  morningStiffness: string;
  swelling: string;
  walkingDifficulty: string;
  stairClimbingDifficulty: string;
  standFromChairDifficulty: string;

  kneeExtensionSection: string;
  sitToStandSection: string;
  walkingTestSection: string;
  cameraSection: string;

  minAngle: string;
  maxAngle: string;
  rom: string;
  smoothness: string;
  repsCounted: string;

  distance: string;
  time: string;
  speed: string;
  cadence: string;
  pauses: string;
  assistanceNeeded: string;

  cameraRom: string;
  cameraConfidence: string;
  imuCameraDiff: string;
  agreement: string;

  resultSection: string;
  categoryHeading: Record<RiskCategory, string>;
  categoryRecommendation: Record<RiskCategory, string>;
  scoreBreakdown: string;
  symptomsComponent: string;
  romComponent: string;
  movementQualityComponent: string;
  mobilityComponent: string;
  agreementComponent: string;
  overall: string;
  disclaimer: string;
}

const en: ReportStrings = {
  title: 'KneeSense NER — Screening Report',
  patientId: 'Patient ID',
  date: 'Date',
  ageGroup: 'Age group',
  location: 'Location',
  kneeTested: 'Knee tested',
  previousInjury: 'Previous injury',
  yes: 'Yes',
  no: 'No',
  notRecorded: 'Not recorded',
  notPerformed: 'Not performed',
  notPerformedSkippedSafety: 'Not performed / skipped for safety',
  notPerformedCameraOnly: 'Not performed (IMU-only screening)',
  status: 'Status',
  difficultyLabels: ['None', 'Mild', 'Moderate', 'Severe'],

  symptomsSection: 'Symptoms',
  avgPainScore: 'Average pain score (0-10)',
  morningStiffness: 'Morning stiffness',
  swelling: 'Swelling',
  walkingDifficulty: 'Walking difficulty',
  stairClimbingDifficulty: 'Stair-climbing difficulty',
  standFromChairDifficulty: 'Standing from chair difficulty',

  kneeExtensionSection: 'Seated knee extension',
  sitToStandSection: 'Sit-to-stand',
  walkingTestSection: 'Walking test',
  cameraSection: 'Camera cross-check',

  minAngle: 'Minimum angle',
  maxAngle: 'Maximum angle',
  rom: 'Range of motion',
  smoothness: 'Movement smoothness (lower = smoother)',
  repsCounted: 'Repetitions counted',

  distance: 'Distance',
  time: 'Time',
  speed: 'Speed',
  cadence: 'Cadence',
  pauses: 'Pauses',
  assistanceNeeded: 'Assistance needed',

  cameraRom: 'Camera range of motion',
  cameraConfidence: 'Camera confidence',
  imuCameraDiff: 'IMU-camera difference',
  agreement: 'Agreement',

  resultSection: 'Screening result',
  categoryHeading: {
    low: 'Low OA-risk markers',
    moderate: 'Moderate OA-risk markers detected',
    high: 'High OA-risk markers detected',
  },
  categoryRecommendation: {
    low: 'No urgent concerns identified. Advise routine monitoring and preventive knee care.',
    moderate:
      'Some risk markers present. Provide preventive guidance and recommend follow-up if symptoms persist or worsen.',
    high: 'Multiple risk markers present. Further clinical evaluation recommended.',
  },
  scoreBreakdown: 'Score breakdown',
  symptomsComponent: 'Symptoms component (30%)',
  romComponent: 'Range of motion component (25%)',
  movementQualityComponent: 'Movement quality component (15%)',
  mobilityComponent: 'Mobility component (20%)',
  agreementComponent: 'Sensor-camera agreement (10%)',
  overall: 'Overall weighted score',
  disclaimer:
    'This is an automated screening result based on self-reported symptoms and movement-sensor readings. ' +
    'It identifies possible OA risk markers only and is NOT a medical diagnosis. Osteoarthritis cannot be ' +
    'confirmed or ruled out by this tool. A qualified clinician should review this result before any clinical ' +
    'decision is made.',
};

// Tamil (தமிழ்). Best-effort translation — review by a native-speaking
// clinician before real deployment, same caveat as src/i18n/translations/ta.ts.
const ta: ReportStrings = {
  title: 'KneeSense NER — சோதனை அறிக்கை',
  patientId: 'நோயாளி ஐடி',
  date: 'தேதி',
  ageGroup: 'வயது குழு',
  location: 'இடம்',
  kneeTested: 'பரிசோதிக்கப்பட்ட முழங்கால்',
  previousInjury: 'முன்பு ஏற்பட்ட காயம்',
  yes: 'ஆம்',
  no: 'இல்லை',
  notRecorded: 'பதிவு செய்யப்படவில்லை',
  notPerformed: 'செய்யப்படவில்லை',
  notPerformedSkippedSafety: 'செய்யப்படவில்லை / பாதுகாப்பிற்காக தவிர்க்கப்பட்டது',
  notPerformedCameraOnly: 'செய்யப்படவில்லை (சென்சார் மட்டும் பயன்படுத்தப்பட்டது)',
  status: 'நிலை',
  difficultyLabels: ['எதுவுமில்லை', 'லேசான', 'மிதமான', 'கடுமையான'],

  symptomsSection: 'அறிகுறிகள்',
  avgPainScore: 'சராசரி வலி மதிப்பெண் (0-10)',
  morningStiffness: 'காலை நேர விறைப்பு',
  swelling: 'வீக்கம்',
  walkingDifficulty: 'நடப்பதில் சிரமம்',
  stairClimbingDifficulty: 'படிக்கட்டு ஏறுவதில் சிரமம்',
  standFromChairDifficulty: 'நாற்காலியிலிருந்து எழுவதில் சிரமம்',

  kneeExtensionSection: 'அமர்ந்தபடி முழங்கால் நீட்டுதல்',
  sitToStandSection: 'சிட்-டு-ஸ்டாண்ட் சோதனை',
  walkingTestSection: 'நடைப் பரிசோதனை',
  cameraSection: 'கேமரா குறுக்கு-சரிபார்ப்பு',

  minAngle: 'குறைந்தபட்ச கோணம்',
  maxAngle: 'அதிகபட்ச கோணம்',
  rom: 'இயக்க வீச்சு',
  smoothness: 'இயக்க மென்மை (குறைவான மதிப்பு = அதிக மென்மை)',
  repsCounted: 'எண்ணப்பட்ட மறுநிகழ்வுகள்',

  distance: 'தூரம்',
  time: 'நேரம்',
  speed: 'வேகம்',
  cadence: 'கேடன்ஸ்',
  pauses: 'இடைநிறுத்தங்கள்',
  assistanceNeeded: 'உதவி தேவைப்பட்டதா',

  cameraRom: 'கேமரா இயக்க வீச்சு',
  cameraConfidence: 'கேமரா நம்பகத்தன்மை',
  imuCameraDiff: 'சென்சார்-கேமரா வேறுபாடு',
  agreement: 'ஒத்திசைவு',

  resultSection: 'பரிசோதனை முடிவு',
  categoryHeading: {
    low: 'எலும்பு தேய்மான (OA) ஆபத்து குறைவு',
    moderate: 'மிதமான OA ஆபத்து அறிகுறிகள் கண்டறியப்பட்டன',
    high: 'அதிக OA ஆபத்து அறிகுறிகள் கண்டறியப்பட்டன',
  },
  categoryRecommendation: {
    low: 'அவசர கவலைக்குரியது எதுவும் இல்லை. வழக்கமான கண்காணிப்பு மற்றும் தடுப்பு முழங்கால் பராமரிப்பை பரிந்துரைக்கவும்.',
    moderate:
      'சில ஆபத்து அறிகுறிகள் உள்ளன. தடுப்பு வழிகாட்டுதலை வழங்கி, அறிகுறிகள் தொடர்ந்தால் அல்லது மோசமடைந்தால் பின்தொடர் ஆலோசனையை பரிந்துரைக்கவும்.',
    high: 'பல ஆபத்து அறிகுறிகள் உள்ளன. மேலதிக மருத்துவ பரிசோதனை பரிந்துரைக்கப்படுகிறது.',
  },
  scoreBreakdown: 'மதிப்பெண் விவரம்',
  symptomsComponent: 'அறிகுறிகள் கூறு (30%)',
  romComponent: 'இயக்க வீச்சு கூறு (25%)',
  movementQualityComponent: 'இயக்க தர கூறு (15%)',
  mobilityComponent: 'இயக்கத் திறன் கூறு (20%)',
  agreementComponent: 'சென்சார்-கேமரா ஒத்திசைவு கூறு (10%)',
  overall: 'மொத்த எடையிட்ட மதிப்பெண்',
  disclaimer:
    'இது நோயாளி தெரிவித்த அறிகுறிகள் மற்றும் இயக்க-சென்சார் அளவீடுகளின் அடிப்படையிலான ஒரு தானியங்கு பரிசோதனை முடிவு ஆகும். ' +
    'இது சாத்தியமான OA ஆபத்து அறிகுறிகளை மட்டுமே அடையாளம் காட்டுகிறது, இது மருத்துவ நோயறிதல் அல்ல. ஆஸ்டியோஆர்த்ரைடிஸை இந்தக் ' +
    'கருவியால் உறுதிப்படுத்தவோ நிராகரிக்கவோ முடியாது. எந்த மருத்துவ முடிவும் எடுப்பதற்கு முன் தகுதியான மருத்துவர் இந்த முடிவை ' +
    'மதிப்பாய்வு செய்ய வேண்டும்.',
};

// Hindi (हिन्दी). Best-effort translation — review by a native-speaking
// clinician before real deployment, same caveat as src/i18n/translations/hi.ts.
const hi: ReportStrings = {
  title: 'KneeSense NER — स्क्रीनिंग रिपोर्ट',
  patientId: 'रोगी आईडी',
  date: 'तारीख',
  ageGroup: 'आयु वर्ग',
  location: 'स्थान',
  kneeTested: 'जांचा गया घुटना',
  previousInjury: 'पिछली चोट',
  yes: 'हाँ',
  no: 'नहीं',
  notRecorded: 'दर्ज नहीं किया गया',
  notPerformed: 'नहीं किया गया',
  notPerformedSkippedSafety: 'नहीं किया गया / सुरक्षा के लिए छोड़ दिया गया',
  notPerformedCameraOnly: 'नहीं किया गया (केवल सेंसर से स्क्रीनिंग)',
  status: 'स्थिति',
  difficultyLabels: ['कोई नहीं', 'हल्का', 'मध्यम', 'गंभीर'],

  symptomsSection: 'लक्षण',
  avgPainScore: 'औसत दर्द स्कोर (0-10)',
  morningStiffness: 'सुबह जकड़न',
  swelling: 'सूजन',
  walkingDifficulty: 'चलने में कठिनाई',
  stairClimbingDifficulty: 'सीढ़ी चढ़ने में कठिनाई',
  standFromChairDifficulty: 'कुर्सी से उठने में कठिनाई',

  kneeExtensionSection: 'बैठकर घुटना सीधा करना',
  sitToStandSection: 'सिट-टू-स्टैंड परीक्षण',
  walkingTestSection: 'चलने का परीक्षण',
  cameraSection: 'कैमरा क्रॉस-चेक',

  minAngle: 'न्यूनतम कोण',
  maxAngle: 'अधिकतम कोण',
  rom: 'गति की सीमा',
  smoothness: 'गति की सहजता (कम मान = अधिक सहज)',
  repsCounted: 'गिनी गई पुनरावृत्तियाँ',

  distance: 'दूरी',
  time: 'समय',
  speed: 'गति',
  cadence: 'कैडेंस',
  pauses: 'रुकना',
  assistanceNeeded: 'सहायता की आवश्यकता',

  cameraRom: 'कैमरा गति की सीमा',
  cameraConfidence: 'कैमरा विश्वसनीयता',
  imuCameraDiff: 'सेंसर-कैमरा अंतर',
  agreement: 'सामंजस्य',

  resultSection: 'स्क्रीनिंग परिणाम',
  categoryHeading: {
    low: 'ऑस्टियोआर्थराइटिस का जोखिम कम',
    moderate: 'ऑस्टियोआर्थराइटिस के मध्यम जोखिम के संकेत मिले',
    high: 'ऑस्टियोआर्थराइटिस के उच्च जोखिम के संकेत मिले',
  },
  categoryRecommendation: {
    low: 'कोई तत्काल चिंता की बात नहीं मिली। नियमित निगरानी और घुटने की सुरक्षात्मक देखभाल की सलाह दें।',
    moderate:
      'कुछ जोखिम संकेत मौजूद हैं। सुरक्षात्मक सलाह दें और यदि लक्षण बने रहें या बढ़ें तो फॉलो-अप की सिफारिश करें।',
    high: 'कई जोखिम संकेत मौजूद हैं। आगे की नैदानिक जांच की सिफारिश की जाती है।',
  },
  scoreBreakdown: 'स्कोर का विवरण',
  symptomsComponent: 'लक्षण घटक (30%)',
  romComponent: 'गति की सीमा घटक (25%)',
  movementQualityComponent: 'गति गुणवत्ता घटक (15%)',
  mobilityComponent: 'गतिशीलता घटक (20%)',
  agreementComponent: 'सेंसर-कैमरा सामंजस्य घटक (10%)',
  overall: 'कुल भारित स्कोर',
  disclaimer:
    'यह रोगी द्वारा बताए गए लक्षणों और मूवमेंट-सेंसर रीडिंग पर आधारित एक स्वचालित स्क्रीनिंग परिणाम है। यह केवल संभावित ' +
    'OA जोखिम संकेतों की पहचान करता है और यह चिकित्सीय निदान नहीं है। ऑस्टियोआर्थराइटिस की इस उपकरण द्वारा पुष्टि या ' +
    'खंडन नहीं किया जा सकता। किसी भी नैदानिक निर्णय से पहले एक योग्य चिकित्सक को इस परिणाम की समीक्षा करनी चाहिए।',
};

// Bengali (বাংলা). Best-effort translation — review by a native-speaking
// clinician before real deployment, same caveat as src/i18n/translations/bn.ts.
const bn: ReportStrings = {
  title: 'KneeSense NER — স্ক্রিনিং রিপোর্ট',
  patientId: 'রোগীর আইডি',
  date: 'তারিখ',
  ageGroup: 'বয়সের গ্রুপ',
  location: 'অবস্থান',
  kneeTested: 'পরীক্ষিত হাঁটু',
  previousInjury: 'পূর্ববর্তী আঘাত',
  yes: 'হ্যাঁ',
  no: 'না',
  notRecorded: 'রেকর্ড করা হয়নি',
  notPerformed: 'করা হয়নি',
  notPerformedSkippedSafety: 'করা হয়নি / নিরাপত্তার জন্য বাদ দেওয়া হয়েছে',
  notPerformedCameraOnly: 'করা হয়নি (শুধু সেন্সর স্ক্রিনিং)',
  status: 'অবস্থা',
  difficultyLabels: ['কোনোটি নয়', 'মৃদু', 'মাঝারি', 'তীব্র'],

  symptomsSection: 'উপসর্গ',
  avgPainScore: 'গড় ব্যথার মাত্রা (0-10)',
  morningStiffness: 'সকালে হাঁটু শক্ত হয়ে থাকা',
  swelling: 'ফোলাভাব',
  walkingDifficulty: 'হাঁটতে অসুবিধা',
  stairClimbingDifficulty: 'সিঁড়ি ওঠায় অসুবিধা',
  standFromChairDifficulty: 'চেয়ার থেকে উঠতে অসুবিধা',

  kneeExtensionSection: 'বসে হাঁটু সোজা করা',
  sitToStandSection: 'সিট-টু-স্ট্যান্ড পরীক্ষা',
  walkingTestSection: 'হাঁটার পরীক্ষা',
  cameraSection: 'ক্যামেরা ক্রস-চেক',

  minAngle: 'সর্বনিম্ন কোণ',
  maxAngle: 'সর্বোচ্চ কোণ',
  rom: 'নড়াচড়ার পরিসর',
  smoothness: 'নড়াচড়ার মসৃণতা (কম মান = বেশি মসৃণ)',
  repsCounted: 'মোট পুনরাবৃত্তি',

  distance: 'দূরত্ব',
  time: 'সময়',
  speed: 'গতি',
  cadence: 'ক্যাডেন্স',
  pauses: 'বিরতি',
  assistanceNeeded: 'সহায়তার প্রয়োজন হয়েছিল',

  cameraRom: 'ক্যামেরা নড়াচড়ার পরিসর',
  cameraConfidence: 'ক্যামেরার নির্ভরযোগ্যতা',
  imuCameraDiff: 'সেন্সর-ক্যামেরা পার্থক্য',
  agreement: 'মিল',

  resultSection: 'স্ক্রিনিং ফলাফল',
  categoryHeading: {
    low: 'অস্টিওআর্থ্রাইটিসের ঝুঁকি কম',
    moderate: 'অস্টিওআর্থ্রাইটিসের ঝুঁকির মাঝারি লক্ষণ পাওয়া গেছে',
    high: 'অস্টিওআর্থ্রাইটিসের ঝুঁকির উচ্চ লক্ষণ পাওয়া গেছে',
  },
  categoryRecommendation: {
    low: 'কোনো জরুরি উদ্বেগের কারণ পাওয়া যায়নি। নিয়মিত পর্যবেক্ষণ ও প্রতিরোধমূলক হাঁটুর যত্নের পরামর্শ দিন।',
    moderate:
      'কিছু ঝুঁকির লক্ষণ পাওয়া গেছে। প্রতিরোধমূলক পরামর্শ দিন এবং উপসর্গ থেকে গেলে বা বাড়লে ফলো-আপের পরামর্শ দিন।',
    high: 'একাধিক ঝুঁকির লক্ষণ পাওয়া গেছে। আরও ক্লিনিক্যাল মূল্যায়নের পরামর্শ দেওয়া হচ্ছে।',
  },
  scoreBreakdown: 'স্কোরের বিস্তারিত হিসাব',
  symptomsComponent: 'উপসর্গ উপাদান (30%)',
  romComponent: 'নড়াচড়ার পরিসর উপাদান (25%)',
  movementQualityComponent: 'নড়াচড়ার মান উপাদান (15%)',
  mobilityComponent: 'চলাফেরা উপাদান (20%)',
  agreementComponent: 'সেন্সর-ক্যামেরা মিল উপাদান (10%)',
  overall: 'সর্বমোট ওজনযুক্ত স্কোর',
  disclaimer:
    'এটি রোগীর নিজের বলা উপসর্গ এবং সেন্সরের তথ্যের ভিত্তিতে একটি স্বয়ংক্রিয় স্ক্রিনিং ফলাফল। এটি শুধুমাত্র সম্ভাব্য ' +
    'অস্টিওআর্থ্রাইটিস ঝুঁকির লক্ষণ চিহ্নিত করে এবং এটি কোনো চিকিৎসাগত রোগনির্ণয় নয়। এই টুল দিয়ে অস্টিওআর্থ্রাইটিস ' +
    'নিশ্চিত বা বাতিল করা যায় না। কোনো সিদ্ধান্ত নেওয়ার আগে একজন যোগ্য চিকিৎসকের এই ফলাফল পর্যালোচনা করা উচিত।',
};

// Assamese (অসমীয়া). Best-effort translation — review by a native-speaking
// clinician before real deployment, same caveat as src/i18n/translations/as.ts.
const as: ReportStrings = {
  title: "KneeSense NER — স্ক্ৰীনিং ৰিপ'ৰ্ট",
  patientId: 'ৰোগীৰ আইডি',
  date: 'তাৰিখ',
  ageGroup: 'বয়সৰ গোট',
  location: 'ঠিকনা',
  kneeTested: 'পৰীক্ষা কৰা আঁঠু',
  previousInjury: 'আগৰ আঘাত',
  yes: 'হয়',
  no: 'নহয়',
  notRecorded: 'লিপিবদ্ধ কৰা হোৱা নাই',
  notPerformed: 'কৰা হোৱা নাই',
  notPerformedSkippedSafety: 'কৰা হোৱা নাই / সুৰক্ষাৰ বাবে বাদ দিয়া হৈছে',
  notPerformedCameraOnly: 'কৰা হোৱা নাই (কেৱল ছেন্সৰ স্ক্ৰীনিং)',
  status: 'স্থিতি',
  difficultyLabels: ['কোনোটোৱেই নহয়', 'লঘু', 'মধ্যম', 'তীব্ৰ'],

  symptomsSection: 'লক্ষণ',
  avgPainScore: 'গড় বিষৰ মাত্ৰা (0-10)',
  morningStiffness: 'ৰাতিপুৱা আঁঠু শক্ত হৈ থকা',
  swelling: 'ফুলাটো',
  walkingDifficulty: 'খোজ কঢ়াত অসুবিধা',
  stairClimbingDifficulty: 'নিখৰি উঠাত অসুবিধা',
  standFromChairDifficulty: 'চকীৰ পৰা উঠাত অসুবিধা',

  kneeExtensionSection: 'বহি আঁঠু পোন কৰা',
  sitToStandSection: 'ছিট-টু-ষ্টেণ্ড পৰীক্ষা',
  walkingTestSection: 'খোজ কঢ়া পৰীক্ষা',
  cameraSection: 'কেমেৰা ক্ৰছ-চেক',

  minAngle: 'সৰ্বনিম্ন কোণ',
  maxAngle: 'সৰ্বোচ্চ কোণ',
  rom: 'চলাচলৰ পৰিসৰ',
  smoothness: 'চলাচলৰ মসৃণতা (কম মানে বেছি মসৃণ)',
  repsCounted: 'মুঠ পুনৰাবৃত্তি',

  distance: 'দূৰত্ব',
  time: 'সময়',
  speed: 'গতি',
  cadence: 'কেডেন্স',
  pauses: 'বিৰতি',
  assistanceNeeded: 'সহায়ৰ প্ৰয়োজন হৈছিল',

  cameraRom: 'কেমেৰা চলাচলৰ পৰিসৰ',
  cameraConfidence: 'কেমেৰাৰ নিৰ্ভৰযোগ্যতা',
  imuCameraDiff: 'ছেন্সৰ-কেমেৰা পাৰ্থক্য',
  agreement: 'মিল',

  resultSection: 'স্ক্ৰীনিং ফলাফল',
  categoryHeading: {
    low: "অষ্টিঅ'আৰ্থ্ৰাইটিছৰ আশংকা কম",
    moderate: "অষ্টিঅ'আৰ্থ্ৰাইটিছৰ আশংকাৰ মধ্যম লক্ষণ পোৱা গ'ল",
    high: "অষ্টিঅ'আৰ্থ্ৰাইটিছৰ আশংকাৰ উচ্চ লক্ষণ পোৱা গ'ল",
  },
  categoryRecommendation: {
    low: "কোনো জৰুৰী চিন্তাৰ কাৰণ পোৱা নগ'ল। নিয়মীয়া পৰ্যবেক্ষণ আৰু প্ৰতিৰোধমূলক আঁঠুৰ যত্নৰ পৰামৰ্শ দিয়ক।",
    moderate:
      "কিছুমান আশংকাৰ লক্ষণ পোৱা গ'ল। প্ৰতিৰোধমূলক পৰামৰ্শ দিয়ক আৰু লক্ষণ থাকি থাকিলে বা বাঢ়িলে ফলো-আপৰ পৰামৰ্শ দিয়ক।",
    high: "একাধিক আশংকাৰ লক্ষণ পোৱা গ'ল। অধিক ক্লিনিকেল মূল্যায়নৰ পৰামৰ্শ দিয়া হৈছে।",
  },
  scoreBreakdown: "স্ক'ৰৰ বিতং হিচাপ",
  symptomsComponent: 'লক্ষণ উপাদান (30%)',
  romComponent: 'চলাচলৰ পৰিসৰ উপাদান (25%)',
  movementQualityComponent: 'চলাচলৰ গুণাগুণ উপাদান (15%)',
  mobilityComponent: 'চলাফুৰা উপাদান (20%)',
  agreementComponent: 'ছেন্সৰ-কেমেৰা মিল উপাদান (10%)',
  overall: "সৰ্বমুঠ ৱেইটেড স্ক'ৰ",
  disclaimer:
    "এইটো ৰোগীয়ে নিজে কোৱা লক্ষণ আৰু চলাচল-ছেন্সৰৰ তথ্যৰ আধাৰত এক স্বয়ংক্ৰিয় স্ক্ৰীনিং ফলাফল। ই কেৱল সম্ভাৱ্য OA " +
    "আশংকাৰ লক্ষণ চিনাক্ত কৰে আৰু ই কোনো চিকিৎসাগত ৰোগ নিৰ্ণয় নহয়। এই সঁজুলিৰ দ্বাৰা অষ্টিঅ'আৰ্থ্ৰাইটিছ নিশ্চিত বা " +
    "নাকচ কৰিব নোৱাৰি। কোনো সিদ্ধান্ত ল'বৰ আগতে এজন যোগ্য চিকিৎসকে এই ফলাফল পৰ্যালোচনা কৰা উচিত।",
};

const REPORT_STRINGS: Partial<Record<Language, ReportStrings>> = { en, ta, hi, bn, as };

export function getReportStrings(language: Language): ReportStrings {
  return REPORT_STRINGS[language] ?? en;
}

/** Languages whose script needs browser-based canvas rendering in the PDF because jsPDF's
 * built-in text() call doesn't perform Indic script shaping (pre-base vowel signs render
 * in the wrong position) — verified empirically for Tamil, Devanagari, and Bengali before
 * building this (Assamese shares Bengali's script, so it inherits the same bug). English
 * and any other Latin-script language render fine through jsPDF's native, faster text path. */
export function needsShapedRendering(language: Language): boolean {
  return language === 'ta' || language === 'hi' || language === 'bn' || language === 'as';
}
