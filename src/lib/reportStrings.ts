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

const REPORT_STRINGS: Partial<Record<Language, ReportStrings>> = { en, ta };

export function getReportStrings(language: Language): ReportStrings {
  return REPORT_STRINGS[language] ?? en;
}

/** Languages whose script needs browser-based canvas rendering in the PDF because jsPDF's
 * built-in text() call doesn't perform Indic script shaping (pre-base vowel signs render
 * in the wrong position) — verified empirically before building this. English and any other
 * Latin-script language render fine through jsPDF's native, faster text path. */
export function needsShapedRendering(language: Language): boolean {
  return language === 'ta';
}
