/**
 * Curated JAMB IBASS Course -> UTME Subject Combination Catalogue (427 Accredited Courses)
 * Source: Official JAMB Integrated Brochure & Syllabus System (IBASS) across 9 faculties.
 * Maps 1:1 to the 25 canonical JAMBPrep database subject codes and names.
 */

export const CANONICAL_JAMB_SUBJECTS = {
  ENG: "Use of English",
  MTH: "Mathematics",
  PHY: "Physics",
  CHM: "Chemistry",
  BIO: "Biology",
  ECN: "Economics",
  GOV: "Government",
  LIT: "Literature in English",
  COM: "Commerce",
  ACC: "Principles of Accounting",
  CRK: "Christian Religious Knowledge",
  IRS: "Islamic Religious Studies",
  GEO: "Geography",
  AGR: "Agricultural Science",
  HIS: "History",
  ARB: "Arabic",
  ART: "Art",
  CMP: "Computer Studies",
  FRN: "French",
  HAU: "Hausa",
  HEC: "Home Economics",
  IGB: "Igbo",
  MUS: "Music",
  PHE: "Physical and Health Education",
  YOR: "Yoruba",
} as const;

export type CanonicalSubjectCode = keyof typeof CANONICAL_JAMB_SUBJECTS;
export type CanonicalSubjectName = (typeof CANONICAL_JAMB_SUBJECTS)[CanonicalSubjectCode];

export const COURSE_FACULTIES = [
  "Medical & Health Sciences",
  "Engineering & Technology",
  "Sciences & Computing",
  "Law",
  "Social Sciences",
  "Management & Commercial",
  "Arts & Humanities",
  "Agriculture & Environmental",
  "Education",
] as const;

export type CourseFaculty = (typeof COURSE_FACULTIES)[number];

export interface FlexibleElectiveSlot {
  /** Number of flexible subjects the student must pick to complete 3 electives */
  pickCount: 1 | 2;
  /** Human-readable instruction, e.g. "Choose 1 from Biology, Agricultural Science, or Economics" */
  slotLabel: string;
  /** Valid subject codes from the 24 non-English JAMB subjects */
  allowedCodes: CanonicalSubjectCode[];
  /** Default pre-selected subject code(s) for 1-click lock-in */
  defaultCodes: CanonicalSubjectCode[];
}

export interface JambCourseCombination {
  /** URL-safe slug, e.g. "medicine-and-surgery" */
  id: string;
  /** Official display title, e.g. "Medicine and Surgery" */
  title: string;
  /** Faculty grouping for filter tabs */
  faculty: CourseFaculty;
  /** Search aliases & student slang, e.g. ["mbbs", "medicine", "doctor"] */
  aliases: string[];
  /** Always "ENG" (Use of English) */
  compulsoryCode: "ENG";
  /** Mandatory non-negotiable elective subject codes (1 to 3 subjects) */
  coreElectiveCodes: CanonicalSubjectCode[];
  /** Optional flexible elective slot when coreElectiveCodes.length < 3 */
  flexibleSlot?: FlexibleElectiveSlot;
  /** Recommended competitive UTME target score (multiple of 5 between 180 and 320) */
  recommendedTargetScore: number;
  /** Display range for competitive federal/state cutoffs, e.g. "290 - 330+" */
  competitiveScoreRange: string;
  /** Official IBASS note or special waiver alert */
  ibassNote: string;
}

export interface ResolvedElectiveSubject {
  code: CanonicalSubjectCode;
  name: CanonicalSubjectName;
  isCore: boolean;
}

export interface ResolvedCourseCombination {
  compulsory: {
    code: "ENG";
    name: "Use of English";
  };
  electives: ResolvedElectiveSubject[];
  electiveCodes: CanonicalSubjectCode[];
  electiveNames: CanonicalSubjectName[];
  selectedFlexibleCodes: CanonicalSubjectCode[];
  isComplete: boolean;
}

export const POPULAR_COURSE_IDS: readonly string[] = [
  "medicine-and-surgery",
  "computer-science",
  "common-law",
  "nursing-science",
  "accounting",
  "mass-communication",
  "mechanical-engineering",
  "pharmacy",
  "economics",
  "business-administration",
  "civil-engineering",
  "cyber-security",
  "medical-laboratory-science",
  "international-relations",
  "microbiology",
  "architecture",
] as const;

export const JAMB_COURSE_COMBINATIONS: readonly JambCourseCombination[] = [
  {
    "id": "medicine-and-surgery",
    "title": "Medicine and Surgery",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "mbbs",
      "medicine",
      "doctor",
      "med surg",
      "surgery"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 300,
    "competitiveScoreRange": "290 - 330+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics. Five O'Level credits including English, Mathematics, Biology, Chemistry, and Physics."
  },
  {
    "id": "dentistry-and-dental-surgery",
    "title": "Dentistry and Dental Surgery",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "dentistry",
      "bds",
      "dental surgeon"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 290,
    "competitiveScoreRange": "280 - 320+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics. Five O'Level credits including English, Mathematics, Biology, Chemistry, and Physics."
  },
  {
    "id": "pharmacy",
    "title": "Pharmacy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "b pharm",
      "pharmacist",
      "pharm"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 290,
    "competitiveScoreRange": "280 - 320+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "doctor-of-pharmacy",
    "title": "Doctor of Pharmacy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "pharm d",
      "pharmacy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 290,
    "competitiveScoreRange": "280 - 320+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "nursing-science",
    "title": "Nursing Science",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "nursing",
      "nurse",
      "bnsc"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "medical-laboratory-science",
    "title": "Medical Laboratory Science",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "med lab",
      "mls",
      "laboratory science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "physiotherapy",
    "title": "Physiotherapy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "physio",
      "physical therapy",
      "bpt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "medical-rehabilitation",
    "title": "Medical Rehabilitation",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "rehab",
      "occupational therapy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "radiography-and-radiation-science",
    "title": "Radiography and Radiation Science",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "radiography",
      "x-ray",
      "medical imaging"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "optometry",
    "title": "Optometry",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "optometrist",
      "od",
      "eye doctor"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "human-anatomy",
    "title": "Human Anatomy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "anatomy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "human-physiology",
    "title": "Human Physiology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "physiology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "pharmacology",
    "title": "Pharmacology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "pharmacology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "public-health",
    "title": "Public Health",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "public health",
      "community health"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and either Physics or Mathematics."
  },
  {
    "id": "environmental-health-science",
    "title": "Environmental Health Science",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "ehs",
      "environmental health"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and either Physics or Mathematics."
  },
  {
    "id": "human-nutrition-and-dietetics",
    "title": "Human Nutrition and Dietetics",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "nutrition",
      "dietetics",
      "food and nutrition"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and one of Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "prosthetics-and-orthotics",
    "title": "Prosthetics and Orthotics",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "prosthetics",
      "orthotics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "audiology",
    "title": "Audiology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "audiology",
      "hearing science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "speech-therapy",
    "title": "Speech Therapy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "speech pathology",
      "speech therapy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "biomedical-technology",
    "title": "Biomedical Technology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "biomed tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "dental-technology",
    "title": "Dental Technology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "dental tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "health-information-management",
    "title": "Health Information Management",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "him",
      "health records"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Mathematics or Physics",
      "allowedCodes": [
        "MTH",
        "PHY"
      ],
      "defaultCodes": [
        "MTH"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Mathematics or Physics."
  },
  {
    "id": "complementary-and-alternative-medicine",
    "title": "Complementary & Alternative Medicine",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "alternative medicine"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Agricultural Science."
  },
  {
    "id": "veterinary-medicine",
    "title": "Veterinary Medicine",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "dvm",
      "vet med",
      "veterinary"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "midwifery",
    "title": "Midwifery",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "midwifery",
      "nurse midwife"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "community-health",
    "title": "Community Health",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "community health science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Agricultural Science."
  },
  {
    "id": "dispensing-opticianry",
    "title": "Dispensing Opticianry",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "dispensing optician"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "dental-therapy",
    "title": "Dental Therapy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "dental therapy",
      "dental hygienist"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "medical-biochemistry",
    "title": "Medical Biochemistry",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "med biochem"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "emergency-medical-technology",
    "title": "Emergency Medical Technology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "emt",
      "paramedics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "civil-engineering",
    "title": "Civil Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "civil",
      "civil eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "mechanical-engineering",
    "title": "Mechanical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "mech",
      "mechanical"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "electrical-engineering",
    "title": "Electrical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "ee",
      "electrical"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "electronics-engineering",
    "title": "Electronics Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "electronics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "electrical-and-electronics-engineering",
    "title": "Electrical & Electronics Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "eee",
      "electrical electronics",
      "elect elect"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "computer-engineering",
    "title": "Computer Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "cpe",
      "comp eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "software-engineering",
    "title": "Software Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "software eng",
      "se"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "CMP"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Chemistry, Biology, or Computer Studies."
  },
  {
    "id": "chemical-engineering",
    "title": "Chemical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "chem eng",
      "chemical"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "petroleum-engineering",
    "title": "Petroleum Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "petroleum eng",
      "pet gas"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 290,
    "competitiveScoreRange": "280 - 320+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "petroleum-and-gas-engineering",
    "title": "Petroleum & Gas Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "pet gas eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 285,
    "competitiveScoreRange": "275 - 315+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "gas-engineering",
    "title": "Gas Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "gas engineering"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "mechatronics-engineering",
    "title": "Mechatronics Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "mechatronics",
      "robotics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "aerospace-engineering",
    "title": "Aerospace Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "aerospace",
      "aeronautical"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "agricultural-and-bio-resources-engineering",
    "title": "Agricultural & Bio-Resources Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "agric eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "AGR"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Agricultural Science."
  },
  {
    "id": "marine-engineering",
    "title": "Marine Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "marine eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "metallurgical-and-materials-engineering",
    "title": "Metallurgical & Materials Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "metallurgical eng",
      "materials"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "systems-engineering",
    "title": "Systems Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "systems eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "biomedical-engineering",
    "title": "Biomedical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "biomedical eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Biology",
      "allowedCodes": [
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Biology."
  },
  {
    "id": "structural-engineering",
    "title": "Structural Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "structural eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "production-and-industrial-engineering",
    "title": "Production & Industrial Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "production eng",
      "industrial eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "automotive-engineering",
    "title": "Automotive Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "automotive eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "telecommunications-engineering",
    "title": "Telecommunications Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "telecoms eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "information-and-communication-engineering",
    "title": "Information & Communication Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "ice",
      "ict engineering"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "polymer-and-textile-engineering",
    "title": "Polymer & Textile Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "polymer eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "food-engineering",
    "title": "Food Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "food eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "water-resources-and-environmental-engineering",
    "title": "Water Resources & Environmental Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "water resources eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "mining-engineering",
    "title": "Mining Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "mining eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "wood-products-engineering",
    "title": "Wood Products Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "wood products eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "AGR"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Agricultural Science."
  },
  {
    "id": "petrochemical-engineering",
    "title": "Petrochemical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "petrochemical eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 285,
    "competitiveScoreRange": "275 - 315+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "geotechnical-engineering",
    "title": "Geotechnical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "geotechnical eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "metallurgical-engineering",
    "title": "Metallurgical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "metallurgical eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "naval-architecture",
    "title": "Naval Architecture",
    "faculty": "Engineering & Technology",
    "aliases": [
      "naval architecture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "building-technology",
    "title": "Building Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "building tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geography, or Economics",
      "allowedCodes": [
        "CHM",
        "GEO",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Chemistry, Geography, or Economics."
  },
  {
    "id": "food-technology",
    "title": "Food Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "food tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Biology, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "BIO",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Chemistry, and one of Physics, Biology, or Agricultural Science."
  },
  {
    "id": "glass-and-ceramic-technology",
    "title": "Glass and Ceramic Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "glass tech",
      "ceramics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "printing-technology",
    "title": "Printing Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "printing tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Art",
      "allowedCodes": [
        "CHM",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Art."
  },
  {
    "id": "welding-and-fabrication-engineering",
    "title": "Welding and Fabrication Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "welding eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "computer-and-communication-engineering",
    "title": "Computer & Communication Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "cce"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "environmental-engineering",
    "title": "Environmental Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "environmental eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "industrial-and-production-engineering",
    "title": "Industrial and Production Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "ipe"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "materials-engineering",
    "title": "Materials Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "materials eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "electronics-and-computer-engineering",
    "title": "Electronics & Computer Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "ece"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "agric-and-environmental-engineering",
    "title": "Agric & Environmental Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "agric environmental eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "AGR"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Agricultural Science."
  },
  {
    "id": "civil-and-environmental-engineering",
    "title": "Civil & Environmental Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "civil environmental eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "electrical-power-engineering",
    "title": "Electrical Power Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "power eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "telecommunication-technology",
    "title": "Telecommunication Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "telecom tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "mechanical-and-production-engineering",
    "title": "Mechanical & Production Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "mech production eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "mining-and-mineral-engineering",
    "title": "Mining & Mineral Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "mining mineral eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "metallurgy-and-materials-science",
    "title": "Metallurgy & Materials Science",
    "faculty": "Engineering & Technology",
    "aliases": [
      "metallurgy materials"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "water-resources-engineering",
    "title": "Water Resources Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "water resources"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "highway-and-transportation-engineering",
    "title": "Highway & Transportation Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "highway eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "soil-and-water-engineering",
    "title": "Soil & Water Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "soil water eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "AGR"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Agricultural Science."
  },
  {
    "id": "farm-power-and-machinery-engineering",
    "title": "Farm Power & Machinery Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "farm power eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "AGR"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Agricultural Science."
  },
  {
    "id": "food-process-engineering",
    "title": "Food Process Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "food process eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "biochemical-engineering",
    "title": "Biochemical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "biochemical eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "robotics-and-automation-engineering",
    "title": "Robotics and Automation Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "robotics eng",
      "automation"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "renewable-energy-engineering",
    "title": "Renewable Energy Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "solar energy eng",
      "renewable energy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "agricultural-science",
    "title": "Agricultural Science",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agric science",
      "agriculture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and one of Physics, Mathematics, or Economics."
  },
  {
    "id": "agriculture",
    "title": "Agriculture",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agric",
      "general agriculture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and one of Physics, Mathematics, or Economics."
  },
  {
    "id": "agricultural-economics",
    "title": "Agricultural Economics",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agric ecn",
      "agribusiness"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and one of Physics, Mathematics, or Economics."
  },
  {
    "id": "agricultural-extension-and-rural-development",
    "title": "Agricultural Extension and Rural Development",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agric extension",
      "rural dev"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and one of Physics, Mathematics, or Economics."
  },
  {
    "id": "agricultural-economics-and-extension",
    "title": "Agricultural Economics & Extension",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agric ecn ext"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and one of Physics, Mathematics, or Economics."
  },
  {
    "id": "agronomy",
    "title": "Agronomy",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agronomy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "crop-production-and-protection",
    "title": "Crop Production and Protection",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "crop production",
      "crop protection"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "crop-science",
    "title": "Crop Science",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "crop science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "soil-science-and-land-management",
    "title": "Soil Science and Land Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "soil science",
      "land management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "animal-science",
    "title": "Animal Science",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "animal science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "animal-production-and-health",
    "title": "Animal Production & Health",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "aph",
      "animal production"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "animal-physiology",
    "title": "Animal Physiology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "animal physiology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "animal-breeding-and-genetics",
    "title": "Animal Breeding & Genetics",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "animal breeding genetics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "animal-nutrition",
    "title": "Animal Nutrition",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "animal nutrition"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "pasture-and-range-management",
    "title": "Pasture & Range Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "pasture management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Agricultural Science."
  },
  {
    "id": "fisheries-and-aquaculture",
    "title": "Fisheries and Aquaculture",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "fisheries",
      "aquaculture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "forestry-and-wildlife-management",
    "title": "Forestry and Wildlife Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "forestry",
      "wildlife"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "ecotourism-and-wildlife-management",
    "title": "Ecotourism and Wildlife Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "ecotourism",
      "wildlife"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Economics, or Agricultural Science",
      "allowedCodes": [
        "GEO",
        "ECN",
        "AGR"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Geography, Economics, or Agricultural Science."
  },
  {
    "id": "food-science-and-technology",
    "title": "Food Science & Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "fst",
      "food science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "home-science-and-management",
    "title": "Home Science and Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "home science",
      "home economics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Economics."
  },
  {
    "id": "nutrition-and-consumer-sciences",
    "title": "Nutrition and Consumer Sciences",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "consumer sciences"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "ECN"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Economics."
  },
  {
    "id": "water-resources-management-and-agrometeorology",
    "title": "Water Resources Management & Agrometeorology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "water resources agrometeorology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "horticultural-science",
    "title": "Horticultural Science",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "horticulture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Agricultural Science."
  },
  {
    "id": "plant-breeding-and-seed-technology",
    "title": "Plant Breeding and Seed Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "plant breeding seed tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "architecture",
    "title": "Architecture",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "architecture",
      "arch"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geography, or Fine Art",
      "allowedCodes": [
        "CHM",
        "GEO",
        "ART"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Chemistry, Geography, or Fine Art."
  },
  {
    "id": "estate-management",
    "title": "Estate Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "estate management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Physics, or Chemistry",
      "allowedCodes": [
        "GEO",
        "PHY",
        "CHM"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and one of Geography, Physics, or Chemistry."
  },
  {
    "id": "quantity-surveying",
    "title": "Quantity Surveying",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "quantity surveying",
      "qs"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geography, or Economics",
      "allowedCodes": [
        "CHM",
        "GEO",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Chemistry, Geography, or Economics."
  },
  {
    "id": "urban-and-regional-planning",
    "title": "Urban and Regional Planning",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "urp",
      "urban planning"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Economics, Physics, Chemistry, or Biology",
      "allowedCodes": [
        "ECN",
        "PHY",
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Geography, and one of Economics, Physics, Chemistry, or Biology."
  },
  {
    "id": "surveying-and-geoinformatics",
    "title": "Surveying and Geoinformatics",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "surveying",
      "geoinformatics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Chemistry, or Biology",
      "allowedCodes": [
        "GEO",
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Geography, Chemistry, or Biology."
  },
  {
    "id": "industrial-design",
    "title": "Industrial Design",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "industrial design"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Fine Art, or Geography",
      "allowedCodes": [
        "CHM",
        "ART",
        "GEO"
      ],
      "defaultCodes": [
        "ART"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Chemistry, Fine Art, or Geography."
  },
  {
    "id": "environmental-management",
    "title": "Environmental Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "environmental management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Physics, or Economics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Geography, Biology, and Chemistry, Physics, or Economics."
  },
  {
    "id": "environmental-protection-and-resources-management",
    "title": "Environmental Protection & Resources Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "environmental protection"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Economics",
      "allowedCodes": [
        "CHM",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Geography, Biology, and Chemistry or Economics."
  },
  {
    "id": "transport-management-technology",
    "title": "Transport Management Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "transport management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Physics, or Commerce",
      "allowedCodes": [
        "GEO",
        "PHY",
        "COM"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Geography, Physics, or Commerce."
  },
  {
    "id": "project-management-technology",
    "title": "Project Management Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "project management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Geography, or Commerce",
      "allowedCodes": [
        "PHY",
        "GEO",
        "COM"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Physics, Geography, or Commerce."
  },
  {
    "id": "maritime-management-technology",
    "title": "Maritime Management Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "maritime management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Physics, or Commerce",
      "allowedCodes": [
        "PHY",
        "GEO",
        "COM"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Physics, Geography, or Commerce."
  },
  {
    "id": "logistics-and-supply-chain-technology",
    "title": "Logistics & Supply Chain Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "logistics tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Physics, or Commerce",
      "allowedCodes": [
        "PHY",
        "GEO",
        "COM"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Physics, Geography, or Commerce."
  },
  {
    "id": "landscape-architecture",
    "title": "Landscape Architecture",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "landscape architecture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Biology, or Fine Art",
      "allowedCodes": [
        "GEO",
        "BIO",
        "ART"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Geography, Biology, or Fine Art."
  },
  {
    "id": "building",
    "title": "Building",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "building"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geography, or Economics",
      "allowedCodes": [
        "CHM",
        "GEO",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Geography, or Economics."
  },
  {
    "id": "geoinformatics-and-surveying",
    "title": "Geoinformatics & Surveying",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "geoinformatics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Chemistry, or Biology",
      "allowedCodes": [
        "GEO",
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Geography, Chemistry, or Biology."
  },
  {
    "id": "meteorology-and-climate-change",
    "title": "Meteorology & Climate Change",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "meteorology climate"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "PHY",
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Chemistry, or Biology",
      "allowedCodes": [
        "GEO",
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Physics, Mathematics, and Geography, Chemistry, or Biology."
  },
  {
    "id": "agribusiness-management",
    "title": "Agribusiness Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "agribusiness"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Economics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "ECN",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Economics, Mathematics, or Agricultural Science."
  },
  {
    "id": "computer-science",
    "title": "Computer Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "csc",
      "comp sci",
      "computing",
      "software"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 additional Science or Social Science subject",
      "allowedCodes": [
        "CHM",
        "BIO",
        "AGR",
        "ECN",
        "GEO",
        "CMP"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and one of Chemistry, Biology, Agricultural Science, Economics, Geography, or Computer Studies."
  },
  {
    "id": "cyber-security",
    "title": "Cyber Security",
    "faculty": "Sciences & Computing",
    "aliases": [
      "cybersecurity",
      "cyber"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, Economics, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "ECN",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, Economics, or Computer Studies."
  },
  {
    "id": "information-technology",
    "title": "Information Technology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "it",
      "infotech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Economics, Geography, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "ECN",
        "GEO",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Economics, Geography, or Computer Studies."
  },
  {
    "id": "information-systems",
    "title": "Information Systems",
    "faculty": "Sciences & Computing",
    "aliases": [
      "is",
      "information systems"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Chemistry, Geography, or Computer Studies",
      "allowedCodes": [
        "PHY",
        "CHM",
        "GEO",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Physics, Chemistry, Geography, or Computer Studies."
  },
  {
    "id": "software-development",
    "title": "Software Development",
    "faculty": "Sciences & Computing",
    "aliases": [
      "software dev"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Computer Studies."
  },
  {
    "id": "data-science",
    "title": "Data Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "data science",
      "analytics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Economics, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "ECN",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Economics, or Computer Studies."
  },
  {
    "id": "artificial-intelligence",
    "title": "Artificial Intelligence",
    "faculty": "Sciences & Computing",
    "aliases": [
      "ai",
      "machine learning"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Computer Studies."
  },
  {
    "id": "library-and-information-science",
    "title": "Library and Information Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "lis",
      "library science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Arts subjects",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "GOV",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 210,
    "competitiveScoreRange": "200 - 240+",
    "ibassNote": "Requires Use of English, Mathematics, and any two other Science, Arts, or Social Science subjects."
  },
  {
    "id": "mathematics",
    "title": "Mathematics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "math",
      "pure mathematics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, Biology, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, Biology, or Economics."
  },
  {
    "id": "pure-and-applied-mathematics",
    "title": "Pure & Applied Mathematics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "pure applied math"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, or Biology",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, or Biology."
  },
  {
    "id": "industrial-mathematics",
    "title": "Industrial Mathematics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "industrial math"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, or Economics."
  },
  {
    "id": "mathematics-with-statistics",
    "title": "Mathematics with Statistics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "math stats"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, or Economics."
  },
  {
    "id": "mathematics-with-computer-science",
    "title": "Mathematics with Computer Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "math comp sci"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Economics",
      "allowedCodes": [
        "CHM",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Economics."
  },
  {
    "id": "statistics",
    "title": "Statistics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "statistics",
      "stats"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, Biology, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "ECN"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, Biology, or Economics."
  },
  {
    "id": "actuarial-science",
    "title": "Actuarial Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "actuarial science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Economics, Physics, Chemistry, or Commerce",
      "allowedCodes": [
        "ECN",
        "PHY",
        "CHM",
        "COM"
      ],
      "defaultCodes": [
        "ECN",
        "COM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Economics, Physics, Chemistry, or Commerce."
  },
  {
    "id": "operations-research",
    "title": "Operations Research",
    "faculty": "Sciences & Computing",
    "aliases": [
      "operations research"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, or Economics."
  },
  {
    "id": "physics",
    "title": "Physics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "physics",
      "pure physics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Geography",
      "allowedCodes": [
        "CHM",
        "BIO",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Geography."
  },
  {
    "id": "pure-and-applied-physics",
    "title": "Pure & Applied Physics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "pure applied physics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Geography",
      "allowedCodes": [
        "CHM",
        "BIO",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Geography."
  },
  {
    "id": "industrial-physics",
    "title": "Industrial Physics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "industrial physics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Geography",
      "allowedCodes": [
        "CHM",
        "BIO",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Geography."
  },
  {
    "id": "physics-with-electronics",
    "title": "Physics with Electronics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "physics electronics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "CMP"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Computer Studies."
  },
  {
    "id": "geophysics",
    "title": "Geophysics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "geophysics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geology, or Geography",
      "allowedCodes": [
        "CHM",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Geology, or Geography."
  },
  {
    "id": "applied-geophysics",
    "title": "Applied Geophysics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "applied geophysics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geology, or Geography",
      "allowedCodes": [
        "CHM",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Geology, or Geography."
  },
  {
    "id": "astronomy-and-space-science",
    "title": "Astronomy and Space Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "astronomy",
      "space science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Geography",
      "allowedCodes": [
        "CHM",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Geography."
  },
  {
    "id": "chemistry",
    "title": "Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "chemistry",
      "pure chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "industrial-chemistry",
    "title": "Industrial Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "industrial chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "pure-and-applied-chemistry",
    "title": "Pure & Applied Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "pure applied chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "petroleum-chemistry",
    "title": "Petroleum Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "petroleum chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "medicinal-chemistry",
    "title": "Medicinal Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "medicinal chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Mathematics."
  },
  {
    "id": "polymer-chemistry",
    "title": "Polymer Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "polymer chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "environmental-chemistry",
    "title": "Environmental Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "environmental chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "biochemistry",
    "title": "Biochemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "biochemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "biology",
    "title": "Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "biology",
      "pure biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "applied-biology",
    "title": "Applied Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "applied biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, or Mathematics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, or Mathematics."
  },
  {
    "id": "microbiology",
    "title": "Microbiology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "microbiology",
      "microbio"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "industrial-microbiology",
    "title": "Industrial Microbiology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "industrial microbiology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "biotechnology",
    "title": "Biotechnology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "biotech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "genetics-and-biotechnology",
    "title": "Genetics and Biotechnology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "genetics biotech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "botany",
    "title": "Botany",
    "faculty": "Sciences & Computing",
    "aliases": [
      "botany",
      "plant science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "plant-science-and-biotechnology",
    "title": "Plant Science and Biotechnology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "plant science biotech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "zoology",
    "title": "Zoology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "zoology",
      "animal science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "applied-zoology",
    "title": "Applied Zoology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "applied zoology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, or Mathematics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, or Mathematics."
  },
  {
    "id": "cell-biology-and-genetics",
    "title": "Cell Biology and Genetics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "cell biology genetics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "marine-biology",
    "title": "Marine Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "marine biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Geography",
      "allowedCodes": [
        "PHY",
        "MTH",
        "GEO"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Mathematics, or Geography."
  },
  {
    "id": "marine-science-and-technology",
    "title": "Marine Science and Technology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "marine science tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Geography",
      "allowedCodes": [
        "PHY",
        "MTH",
        "GEO"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Mathematics, or Geography."
  },
  {
    "id": "parasitology-and-entomology",
    "title": "Parasitology and Entomology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "parasitology entomology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "ecology-and-environmental-biology",
    "title": "Ecology and Environmental Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "ecology environmental biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Geography, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "GEO",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Geography, or Agricultural Science."
  },
  {
    "id": "conservation-biology",
    "title": "Conservation Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "conservation biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Geography, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "GEO",
        "AGR"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Geography, or Agricultural Science."
  },
  {
    "id": "geology",
    "title": "Geology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "geology",
      "earth science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Geography",
      "allowedCodes": [
        "CHM",
        "BIO",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Geography."
  },
  {
    "id": "earth-sciences",
    "title": "Earth Sciences",
    "faculty": "Sciences & Computing",
    "aliases": [
      "earth sciences"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Geography",
      "allowedCodes": [
        "CHM",
        "BIO",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Geography."
  },
  {
    "id": "meteorology",
    "title": "Meteorology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "meteorology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geography, or Biology",
      "allowedCodes": [
        "CHM",
        "GEO",
        "BIO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Geography, or Biology."
  },
  {
    "id": "science-laboratory-technology",
    "title": "Science Laboratory Technology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "slt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "forensic-science",
    "title": "Forensic Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "forensics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "brewing-science-and-technology",
    "title": "Brewing Science and Technology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "brewing science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "applied-chemistry",
    "title": "Applied Chemistry",
    "faculty": "Sciences & Computing",
    "aliases": [
      "applied chemistry"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "applied-physics",
    "title": "Applied Physics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "applied physics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Geography",
      "allowedCodes": [
        "CHM",
        "BIO",
        "GEO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Geography."
  },
  {
    "id": "industrial-mathematics-and-statistics",
    "title": "Industrial Mathematics and Statistics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "industrial math stats"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "ECN"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, or Economics."
  },
  {
    "id": "geoinformatics",
    "title": "Geoinformatics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "geoinformatics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Chemistry, or Biology",
      "allowedCodes": [
        "GEO",
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Geography, Chemistry, or Biology."
  },
  {
    "id": "oceanography",
    "title": "Oceanography",
    "faculty": "Sciences & Computing",
    "aliases": [
      "oceanography"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Geography",
      "allowedCodes": [
        "PHY",
        "MTH",
        "GEO"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Mathematics, or Geography."
  },
  {
    "id": "biomathematics",
    "title": "Biomathematics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "biomathematics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Chemistry",
      "allowedCodes": [
        "PHY",
        "CHM"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Biology, and Physics or Chemistry."
  },
  {
    "id": "computational-biology",
    "title": "Computational Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "computational biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Chemistry, or Computer Studies",
      "allowedCodes": [
        "PHY",
        "CHM",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Biology, and Physics, Chemistry, or Computer Studies."
  },
  {
    "id": "bioinformatics",
    "title": "Bioinformatics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "bioinformatics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Physics, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "PHY",
        "CMP"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Biology, and Chemistry, Physics, or Computer Studies."
  },
  {
    "id": "economics",
    "title": "Economics",
    "faculty": "Social Sciences",
    "aliases": [
      "econ",
      "economics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Government, Geography, Commerce, or Principles of Accounting",
      "allowedCodes": [
        "GOV",
        "GEO",
        "COM",
        "ACC"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Government, Geography, Commerce, or Principles of Accounting."
  },
  {
    "id": "economics-and-development-studies",
    "title": "Economics & Development Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "econ dev studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Government, Geography, Commerce, or Principles of Accounting",
      "allowedCodes": [
        "GOV",
        "GEO",
        "COM",
        "ACC"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Government, Geography, Commerce, or Principles of Accounting."
  },
  {
    "id": "political-science",
    "title": "Political Science",
    "faculty": "Social Sciences",
    "aliases": [
      "pol science",
      "pol govt",
      "pol sci"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "HIS",
        "GEO",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "political-science-and-public-administration",
    "title": "Political Science & Public Administration",
    "faculty": "Social Sciences",
    "aliases": [
      "pol admin"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "HIS",
        "GEO",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "international-relations",
    "title": "International Relations",
    "faculty": "Social Sciences",
    "aliases": [
      "ir",
      "diplomacy",
      "international studies",
      "int relations"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "HIS",
        "GEO",
        "FRN"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "international-studies-and-diplomacy",
    "title": "International Studies & Diplomacy",
    "faculty": "Social Sciences",
    "aliases": [
      "international studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "HIS",
        "GEO",
        "FRN"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "peace-and-conflict-resolution",
    "title": "Peace & Conflict Resolution",
    "faculty": "Social Sciences",
    "aliases": [
      "peace studies",
      "conflict resolution"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "HIS",
        "GEO",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "mass-communication",
    "title": "Mass Communication",
    "faculty": "Social Sciences",
    "aliases": [
      "mass comm",
      "journalism",
      "broadcasting"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "CRK",
        "IRS",
        "HIS",
        "ECN",
        "GEO"
      ],
      "defaultCodes": [
        "LIT",
        "ECN"
      ]
    },
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Government, Literature in English, and any other Arts or Social Science subject."
  },
  {
    "id": "journalism-and-media-studies",
    "title": "Journalism & Media Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "journalism",
      "media"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "CRK",
        "IRS",
        "HIS",
        "ECN"
      ],
      "defaultCodes": [
        "LIT",
        "ECN"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "broadcasting",
    "title": "Broadcasting",
    "faculty": "Social Sciences",
    "aliases": [
      "broadcasting"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "CRK",
        "IRS",
        "HIS",
        "ECN"
      ],
      "defaultCodes": [
        "LIT",
        "ECN"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "information-and-media-studies",
    "title": "Information & Media Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "information media"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "CRK",
        "IRS",
        "HIS",
        "ECN"
      ],
      "defaultCodes": [
        "LIT",
        "ECN"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "film-and-multimedia-studies",
    "title": "Film & Multimedia Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "film studies",
      "multimedia"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "ART",
        "HIS",
        "CRK"
      ],
      "defaultCodes": [
        "LIT",
        "ART"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "sociology",
    "title": "Sociology",
    "faculty": "Social Sciences",
    "aliases": [
      "sociology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "GEO",
        "HIS",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "anthropology",
    "title": "Anthropology",
    "faculty": "Social Sciences",
    "aliases": [
      "anthropology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "GEO",
        "HIS",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "GEO"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "sociology-and-anthropology",
    "title": "Sociology & Anthropology",
    "faculty": "Social Sciences",
    "aliases": [
      "soc anth"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "GEO",
        "HIS",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "GEO"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "psychology",
    "title": "Psychology",
    "faculty": "Social Sciences",
    "aliases": [
      "psychology",
      "psych"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "MTH",
        "PHY",
        "CHM"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science or Social Science subjects."
  },
  {
    "id": "clinical-psychology",
    "title": "Clinical Psychology",
    "faculty": "Social Sciences",
    "aliases": [
      "clinical psych"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "MTH",
        "PHY",
        "CHM"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science or Social Science subjects."
  },
  {
    "id": "industrial-and-organizational-psychology",
    "title": "Industrial & Organizational Psychology",
    "faculty": "Social Sciences",
    "aliases": [
      "industrial psych"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "MTH",
        "COM",
        "ACC"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science or Social Science subjects."
  },
  {
    "id": "criminology-and-security-studies",
    "title": "Criminology and Security Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "criminology",
      "security studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "intelligence-and-security-studies",
    "title": "Intelligence & Security Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "intelligence security"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "geography",
    "title": "Geography",
    "faculty": "Social Sciences",
    "aliases": [
      "geography"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "GOV",
        "BIO",
        "PHY"
      ],
      "defaultCodes": [
        "MTH",
        "ECN"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Geography, and any two other Science or Social Science subjects."
  },
  {
    "id": "geography-and-regional-planning",
    "title": "Geography & Regional Planning",
    "faculty": "Social Sciences",
    "aliases": [
      "geography regional planning"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "GOV",
        "BIO",
        "PHY"
      ],
      "defaultCodes": [
        "MTH",
        "ECN"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Geography, and any two other Science or Social Science subjects."
  },
  {
    "id": "demography-and-social-statistics",
    "title": "Demography and Social Statistics",
    "faculty": "Social Sciences",
    "aliases": [
      "demography social stats"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "GOV",
        "GEO",
        "BIO"
      ],
      "defaultCodes": [
        "ECN",
        "GOV"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, and any two other Science or Social Science subjects."
  },
  {
    "id": "social-work",
    "title": "Social Work",
    "faculty": "Social Sciences",
    "aliases": [
      "social work"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "public-administration",
    "title": "Public Administration",
    "faculty": "Social Sciences",
    "aliases": [
      "public admin"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "ACC",
        "COM"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "local-government-and-development-studies",
    "title": "Local Government & Development Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "local government"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "ACC",
        "COM"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "philosophy-and-public-affairs",
    "title": "Philosophy & Public Affairs",
    "faculty": "Social Sciences",
    "aliases": [
      "philosophy public affairs"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "CRK",
        "IRS",
        "ECN"
      ],
      "defaultCodes": [
        "LIT",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "social-justice",
    "title": "Social Justice",
    "faculty": "Social Sciences",
    "aliases": [
      "social justice"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "gender-studies",
    "title": "Gender and Development Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "gender studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "industrial-relations",
    "title": "Industrial Relations",
    "faculty": "Social Sciences",
    "aliases": [
      "industrial relations"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "ACC",
        "COM",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "COM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "population-and-development-studies",
    "title": "Population and Development Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "population studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "GOV",
        "BIO"
      ],
      "defaultCodes": [
        "MTH",
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Geography, and any two other Science or Social Science subjects."
  },
  {
    "id": "development-studies",
    "title": "Development Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "development studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "politology",
    "title": "Political Science and Diplomacy",
    "faculty": "Social Sciences",
    "aliases": [
      "politology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "HIS",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "strategic-studies",
    "title": "Strategic Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "strategic studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "public-policy-and-administration",
    "title": "Public Policy & Administration",
    "faculty": "Social Sciences",
    "aliases": [
      "public policy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "ACC"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "accounting",
    "title": "Accounting / Accountancy",
    "faculty": "Management & Commercial",
    "aliases": [
      "acct",
      "accountancy",
      "chartered accountant",
      "aca",
      "ican"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "business-administration",
    "title": "Business Administration",
    "faculty": "Management & Commercial",
    "aliases": [
      "bus admin",
      "business mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "business-management",
    "title": "Business Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "management",
      "mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "banking-and-finance",
    "title": "Banking and Finance",
    "faculty": "Management & Commercial",
    "aliases": [
      "banking finance",
      "finance"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "finance",
    "title": "Finance",
    "faculty": "Management & Commercial",
    "aliases": [
      "finance"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "islamic-banking-and-finance",
    "title": "Islamic Banking & Finance",
    "faculty": "Management & Commercial",
    "aliases": [
      "islamic banking"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "IRS"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Islamic Religious Studies."
  },
  {
    "id": "marketing",
    "title": "Marketing",
    "faculty": "Management & Commercial",
    "aliases": [
      "marketing"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "insurance",
    "title": "Insurance",
    "faculty": "Management & Commercial",
    "aliases": [
      "insurance"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "actuarial-science-and-insurance",
    "title": "Actuarial Science & Insurance",
    "faculty": "Management & Commercial",
    "aliases": [
      "actuarial insurance"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "risk-management-and-insurance",
    "title": "Risk Management & Insurance",
    "faculty": "Management & Commercial",
    "aliases": [
      "risk management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "industrial-relations-and-personnel-management",
    "title": "Industrial Relations & Personnel Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "irpm",
      "hr"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "human-resource-management",
    "title": "Human Resource Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "hrm",
      "human resources"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "employment-relations-and-human-resource-management",
    "title": "Employment Relations & HR Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "erhrm"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "entrepreneurship",
    "title": "Entrepreneurship",
    "faculty": "Management & Commercial",
    "aliases": [
      "entrepreneurship"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "entrepreneurship-and-innovation",
    "title": "Entrepreneurship & Innovation",
    "faculty": "Management & Commercial",
    "aliases": [
      "entrepreneurship innovation"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "cooperative-and-rural-development",
    "title": "Cooperative & Rural Development",
    "faculty": "Management & Commercial",
    "aliases": [
      "cooperative rural dev"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "AGR"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Agricultural Science."
  },
  {
    "id": "cooperative-economics-and-management",
    "title": "Cooperative Economics & Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "cem",
      "cooperative economics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "AGR"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Agricultural Science."
  },
  {
    "id": "taxation",
    "title": "Taxation",
    "faculty": "Management & Commercial",
    "aliases": [
      "taxation",
      "tax"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "customs-and-excise-management",
    "title": "Customs & Excise Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "customs management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "office-and-information-management",
    "title": "Office & Information Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "office management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "CMP"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Computer Studies."
  },
  {
    "id": "secretarial-administration",
    "title": "Secretarial Administration",
    "faculty": "Management & Commercial",
    "aliases": [
      "secretarial admin"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "procurement-and-supply-chain-management",
    "title": "Procurement & Supply Chain Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "procurement supply chain"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "public-relations-and-advertising",
    "title": "Public Relations & Advertising",
    "faculty": "Management & Commercial",
    "aliases": [
      "pra",
      "advertising"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "LIT"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Literature in English."
  },
  {
    "id": "e-commerce-and-digital-business",
    "title": "E-Commerce & Digital Business",
    "faculty": "Management & Commercial",
    "aliases": [
      "e-commerce digital business"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Computer Studies."
  },
  {
    "id": "hospitality-and-tourism-management",
    "title": "Hospitality & Tourism Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "hospitality tourism"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "hotel-and-catering-management",
    "title": "Hotel & Catering Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "hotel management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "HEC"
      ],
      "defaultCodes": [
        "HEC"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Home Economics."
  },
  {
    "id": "transport-and-logistics-management",
    "title": "Transport & Logistics Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "transport logistics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "project-management",
    "title": "Project Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "project mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "PHY"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Physics."
  },
  {
    "id": "office-technology-and-management",
    "title": "Office Technology and Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "otm"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "CMP"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Computer Studies."
  },
  {
    "id": "financial-studies",
    "title": "Financial Studies",
    "faculty": "Management & Commercial",
    "aliases": [
      "financial studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "logistics-management",
    "title": "Logistics Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "logistics mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "tourism-management",
    "title": "Tourism Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "tourism mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "event-management",
    "title": "Event Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "event mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "real-estate-management",
    "title": "Real Estate Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "real estate mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV",
        "GEO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
  },
  {
    "id": "commercial-law-and-management",
    "title": "Commercial Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "commercial mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 Social Science or Commercial subject",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "common-law",
    "title": "Common Law / Civil Law",
    "faculty": "Law",
    "aliases": [
      "law",
      "llb",
      "legal studies",
      "barrister"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "CRK",
        "IRS",
        "HIS",
        "ECN",
        "GEO",
        "FRN"
      ],
      "defaultCodes": [
        "GOV",
        "CRK"
      ]
    },
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "civil-law",
    "title": "Civil Law",
    "faculty": "Law",
    "aliases": [
      "civil law",
      "llb"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "CRK",
        "IRS",
        "HIS",
        "ECN",
        "GEO"
      ],
      "defaultCodes": [
        "GOV",
        "CRK"
      ]
    },
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "common-and-islamic-law",
    "title": "Common and Islamic Law",
    "faculty": "Law",
    "aliases": [
      "sharia law",
      "islamic law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT",
      "IRS"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Government, History, or Arabic",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ARB"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Literature in English, Islamic Religious Studies, and one of Government, History, or Arabic."
  },
  {
    "id": "islamic-law",
    "title": "Islamic Law (Sharia)",
    "faculty": "Law",
    "aliases": [
      "islamic law",
      "sharia"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "IRS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ARB",
        "LIT",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Islamic Religious Studies, and any two other Arts or Social Science subjects."
  },
  {
    "id": "private-and-islamic-law",
    "title": "Private and Islamic Law",
    "faculty": "Law",
    "aliases": [
      "private islamic law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT",
      "IRS"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Government, History, or Arabic",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ARB"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Literature in English, Islamic Religious Studies, and one of Government, History, or Arabic."
  },
  {
    "id": "public-and-international-law",
    "title": "Public and International Law",
    "faculty": "Law",
    "aliases": [
      "public international law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "CRK",
        "IRS",
        "HIS",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "CRK"
      ]
    },
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "commercial-and-industrial-law",
    "title": "Commercial and Industrial Law",
    "faculty": "Law",
    "aliases": [
      "commercial law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "ACC",
        "COM",
        "HIS"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "jurisprudence-and-international-law",
    "title": "Jurisprudence and International Law",
    "faculty": "Law",
    "aliases": [
      "jurisprudence"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "CRK",
        "IRS",
        "HIS",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "CRK"
      ]
    },
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "customary-law",
    "title": "Customary Law",
    "faculty": "Law",
    "aliases": [
      "customary law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "international-law-and-jurisprudence",
    "title": "International Law & Jurisprudence",
    "faculty": "Law",
    "aliases": [
      "international law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "CRK",
        "IRS",
        "HIS",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "CRK"
      ]
    },
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "english-language",
    "title": "English Language",
    "faculty": "Arts & Humanities",
    "aliases": [
      "english",
      "english lang"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "FRN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "english-and-literary-studies",
    "title": "English & Literary Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "english literature",
      "els"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "FRN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "literature-in-english",
    "title": "Literature in English",
    "faculty": "Arts & Humanities",
    "aliases": [
      "lit in english"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "FRN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "theatre-arts",
    "title": "Theatre Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "theatre arts",
      "drama",
      "performing arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "ART",
        "MUS"
      ],
      "defaultCodes": [
        "GOV",
        "ART"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "performing-arts",
    "title": "Performing Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "performing arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ART",
        "MUS"
      ],
      "defaultCodes": [
        "GOV",
        "ART"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "dramatic-arts",
    "title": "Dramatic Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "dramatic arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ART"
      ],
      "defaultCodes": [
        "GOV",
        "ART"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "theatre-and-media-arts",
    "title": "Theatre & Media Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "theatre media arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ART"
      ],
      "defaultCodes": [
        "GOV",
        "ART"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "creative-arts",
    "title": "Creative Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "creative arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT",
      "ART"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Government, History, Music, or French",
      "allowedCodes": [
        "GOV",
        "HIS",
        "MUS",
        "FRN"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Literature in English, Fine Art, and any other Arts subject."
  },
  {
    "id": "visual-arts",
    "title": "Visual Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "visual arts",
      "fine arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ART"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "GOV",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Fine Art, and any two other Arts subjects."
  },
  {
    "id": "fine-and-applied-arts",
    "title": "Fine & Applied Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "fine arts",
      "applied arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ART"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "GOV",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Fine Art, and any two other Arts subjects."
  },
  {
    "id": "music",
    "title": "Music",
    "faculty": "Arts & Humanities",
    "aliases": [
      "music"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MUS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "GOV",
        "ART"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Music, and any two other Arts subjects."
  },
  {
    "id": "history",
    "title": "History",
    "faculty": "Arts & Humanities",
    "aliases": [
      "history"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "CRK",
        "IRS",
        "ECN",
        "GEO"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "history-and-international-studies",
    "title": "History & International Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "history international studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "CRK",
        "IRS",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "history-and-diplomatic-studies",
    "title": "History & Diplomatic Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "history diplomatic studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "CRK",
        "IRS",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "archaeology",
    "title": "Archaeology",
    "faculty": "Arts & Humanities",
    "aliases": [
      "archaeology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Science/Social Science subjects",
      "allowedCodes": [
        "GOV",
        "GEO",
        "LIT",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "GEO"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, History, and any two other Arts, Science, or Social Science subjects."
  },
  {
    "id": "archaeology-and-heritage-studies",
    "title": "Archaeology & Heritage Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "archaeology heritage"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Science/Social Science subjects",
      "allowedCodes": [
        "GOV",
        "GEO",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "GEO"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, History, and any two other Arts, Science, or Social Science subjects."
  },
  {
    "id": "philosophy",
    "title": "Philosophy",
    "faculty": "Arts & Humanities",
    "aliases": [
      "philosophy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "CRK",
        "IRS",
        "ECN"
      ],
      "defaultCodes": [
        "LIT",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "religious-studies",
    "title": "Religious Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "religious studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CRK"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Christian Religious Knowledge, and any two other Arts subjects."
  },
  {
    "id": "christian-religious-studies",
    "title": "Christian Religious Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "crs",
      "crk"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CRK"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Christian Religious Knowledge, and any two other Arts subjects."
  },
  {
    "id": "theology",
    "title": "Theology",
    "faculty": "Arts & Humanities",
    "aliases": [
      "theology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CRK"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Christian Religious Knowledge, and any two other Arts subjects."
  },
  {
    "id": "islamic-studies",
    "title": "Islamic Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "islamic studies",
      "irs"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "IRS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT",
        "ARB"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Islamic Religious Studies, and any two other Arts subjects."
  },
  {
    "id": "arabic-studies",
    "title": "Arabic Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "arabic"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ARB"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Arabic, and any two other Arts subjects."
  },
  {
    "id": "arabic-and-islamic-studies",
    "title": "Arabic & Islamic Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "arabic islamic studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ARB",
      "IRS"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Government or History",
      "allowedCodes": [
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Arabic, Islamic Religious Studies, and one of Government or History."
  },
  {
    "id": "linguistics",
    "title": "Linguistics",
    "faculty": "Arts & Humanities",
    "aliases": [
      "linguistics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "FRN",
        "HAU",
        "IGB",
        "YOR"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "linguistics-and-nigerian-languages",
    "title": "Linguistics & Nigerian Languages",
    "faculty": "Arts & Humanities",
    "aliases": [
      "nigerian languages"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "HAU",
        "IGB",
        "YOR",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "HAU",
        "GOV"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "linguistics-and-african-languages",
    "title": "Linguistics & African Languages",
    "faculty": "Arts & Humanities",
    "aliases": [
      "african languages"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "HAU",
        "IGB",
        "YOR",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "IGB",
        "GOV"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "linguistics-and-communication-studies",
    "title": "Linguistics & Communication Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "linguistics communication"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ECN",
        "GEO"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "french",
    "title": "French",
    "faculty": "Arts & Humanities",
    "aliases": [
      "french"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "FRN"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS",
        "CRK"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, French, and any two other Arts subjects."
  },
  {
    "id": "modern-european-languages",
    "title": "Modern European Languages",
    "faculty": "Arts & Humanities",
    "aliases": [
      "modern european languages"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "FRN"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, French, and any two other Arts subjects."
  },
  {
    "id": "hausa",
    "title": "Hausa",
    "faculty": "Arts & Humanities",
    "aliases": [
      "hausa language"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HAU"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS",
        "IRS",
        "CRK"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Hausa, and any two other Arts subjects."
  },
  {
    "id": "igbo",
    "title": "Igbo",
    "faculty": "Arts & Humanities",
    "aliases": [
      "igbo language"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "IGB"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS",
        "CRK"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Igbo, and any two other Arts subjects."
  },
  {
    "id": "yoruba",
    "title": "Yoruba",
    "faculty": "Arts & Humanities",
    "aliases": [
      "yoruba language"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "YOR"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS",
        "CRK"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Yoruba, and any two other Arts subjects."
  },
  {
    "id": "communication-and-language-arts",
    "title": "Communication and Language Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "cla"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ECN",
        "GEO"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "translation-studies",
    "title": "Translation Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "translation studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "FRN"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS",
        "ARB"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, French, and any two other Arts subjects."
  },
  {
    "id": "cultural-and-media-studies",
    "title": "Cultural & Media Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "cultural media studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ART"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "classical-studies",
    "title": "Classical Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "classical studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts subjects."
  },
  {
    "id": "folklore-and-african-mythology",
    "title": "Folklore and African Mythology",
    "faculty": "Arts & Humanities",
    "aliases": [
      "folklore"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts subjects."
  },
  {
    "id": "theater-and-film-studies",
    "title": "Theater & Film Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "theater film"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "ART"
      ],
      "defaultCodes": [
        "GOV",
        "ART"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "african-studies",
    "title": "African Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "african studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "peace-and-strategic-studies-arts",
    "title": "Peace and Strategic Studies (Arts)",
    "faculty": "Arts & Humanities",
    "aliases": [
      "peace strategic arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "combined-arts",
    "title": "Combined Arts",
    "faculty": "Arts & Humanities",
    "aliases": [
      "combined arts"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "FRN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts subjects."
  },
  {
    "id": "education-and-biology",
    "title": "Education & Biology",
    "faculty": "Education",
    "aliases": [
      "ed bio",
      "biology education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "education-and-chemistry",
    "title": "Education & Chemistry",
    "faculty": "Education",
    "aliases": [
      "ed chem",
      "chemistry education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Mathematics, or Biology",
      "allowedCodes": [
        "PHY",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "PHY",
        "MTH"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Chemistry, and any two of Physics, Mathematics, or Biology."
  },
  {
    "id": "education-and-physics",
    "title": "Education & Physics",
    "faculty": "Education",
    "aliases": [
      "ed physics",
      "physics education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Mathematics, or Biology",
      "allowedCodes": [
        "CHM",
        "MTH",
        "BIO"
      ],
      "defaultCodes": [
        "CHM",
        "MTH"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Physics, and any two of Chemistry, Mathematics, or Biology."
  },
  {
    "id": "education-and-mathematics",
    "title": "Education & Mathematics",
    "faculty": "Education",
    "aliases": [
      "ed math",
      "mathematics education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, Biology, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, Biology, or Economics."
  },
  {
    "id": "education-and-computer-science",
    "title": "Education & Computer Science",
    "faculty": "Education",
    "aliases": [
      "ed computer science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Physics, Chemistry, Biology, or Economics",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, and any two of Physics, Chemistry, Biology, or Economics."
  },
  {
    "id": "education-and-integrated-science",
    "title": "Education & Integrated Science",
    "faculty": "Education",
    "aliases": [
      "integrated science education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, or Mathematics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, and any two of Chemistry, Physics, or Mathematics."
  },
  {
    "id": "education-and-agricultural-science",
    "title": "Education & Agricultural Science",
    "faculty": "Education",
    "aliases": [
      "agric education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "AGR",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Physics, or Economics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Agricultural Science, Biology, and Chemistry, Physics, or Economics."
  },
  {
    "id": "education-and-geography",
    "title": "Education & Geography",
    "faculty": "Education",
    "aliases": [
      "geography education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "GOV",
        "BIO"
      ],
      "defaultCodes": [
        "MTH",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Geography, and any two other Science or Social Science subjects."
  },
  {
    "id": "education-and-economics",
    "title": "Education & Economics",
    "faculty": "Education",
    "aliases": [
      "economics education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Social Science or Commercial subjects",
      "allowedCodes": [
        "MTH",
        "GOV",
        "ACC",
        "COM",
        "GEO"
      ],
      "defaultCodes": [
        "MTH",
        "GOV"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Economics, and any two other Social Science or Commercial subjects."
  },
  {
    "id": "education-and-political-science",
    "title": "Education & Political Science",
    "faculty": "Education",
    "aliases": [
      "political science education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "education-and-social-studies",
    "title": "Education & Social Studies",
    "faculty": "Education",
    "aliases": [
      "social studies education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "education-and-accountancy",
    "title": "Education & Accountancy",
    "faculty": "Education",
    "aliases": [
      "accounting education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ACC"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Social Science or Commercial subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "MTH",
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Principles of Accounting, and any two other Social Science or Commercial subjects."
  },
  {
    "id": "business-education",
    "title": "Business Education",
    "faculty": "Education",
    "aliases": [
      "business education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Principles of Accounting, Commerce, or Government",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "secretarial-education",
    "title": "Education & Secretarial",
    "faculty": "Education",
    "aliases": [
      "secretarial education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Principles of Accounting, Commerce, or Government",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "marketing-education",
    "title": "Marketing Education",
    "faculty": "Education",
    "aliases": [
      "marketing education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Principles of Accounting, Commerce, or Government",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "education-and-english-language",
    "title": "Education & English Language",
    "faculty": "Education",
    "aliases": [
      "english education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "education-and-literature-in-english",
    "title": "Education & Literature in English",
    "faculty": "Education",
    "aliases": [
      "lit education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "education-and-french",
    "title": "Education & French",
    "faculty": "Education",
    "aliases": [
      "french education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "FRN"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, French, and any two other Arts subjects."
  },
  {
    "id": "education-and-history",
    "title": "Education & History",
    "faculty": "Education",
    "aliases": [
      "history education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "education-and-christian-religious-studies",
    "title": "Education & Christian Religious Studies",
    "faculty": "Education",
    "aliases": [
      "crs education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CRK"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Christian Religious Knowledge, and any two other Arts subjects."
  },
  {
    "id": "education-and-islamic-studies",
    "title": "Education & Islamic Studies",
    "faculty": "Education",
    "aliases": [
      "irs education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "IRS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT",
        "ARB"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Islamic Religious Studies, and any two other Arts subjects."
  },
  {
    "id": "education-and-arabic",
    "title": "Education & Arabic",
    "faculty": "Education",
    "aliases": [
      "arabic education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ARB"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "LIT",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Arabic, and any two other Arts subjects."
  },
  {
    "id": "education-and-fine-art",
    "title": "Education & Fine Art",
    "faculty": "Education",
    "aliases": [
      "fine art education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "ART"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "GOV"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Fine Art, and any two other Arts subjects."
  },
  {
    "id": "education-and-music",
    "title": "Education & Music",
    "faculty": "Education",
    "aliases": [
      "music education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MUS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "HIS",
        "GOV"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Music, and any two other Arts subjects."
  },
  {
    "id": "education-and-hausa",
    "title": "Education & Hausa",
    "faculty": "Education",
    "aliases": [
      "hausa education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HAU"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Hausa, and any two other Arts subjects."
  },
  {
    "id": "education-and-igbo",
    "title": "Education & Igbo",
    "faculty": "Education",
    "aliases": [
      "igbo education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "IGB"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Igbo, and any two other Arts subjects."
  },
  {
    "id": "education-and-yoruba",
    "title": "Education & Yoruba",
    "faculty": "Education",
    "aliases": [
      "yoruba education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "YOR"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "LIT",
        "GOV",
        "HIS"
      ],
      "defaultCodes": [
        "LIT",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Yoruba, and any two other Arts subjects."
  },
  {
    "id": "guidance-and-counselling",
    "title": "Guidance & Counselling",
    "faculty": "Education",
    "aliases": [
      "guidance counselling"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Science/Social Science subjects",
      "allowedCodes": [
        "ECN",
        "BIO",
        "LIT",
        "HIS"
      ],
      "defaultCodes": [
        "ECN",
        "BIO"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts, Science, or Social Science subjects."
  },
  {
    "id": "educational-management",
    "title": "Educational Management",
    "faculty": "Education",
    "aliases": [
      "ed management",
      "educational admin"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "ACC"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "educational-administration-and-planning",
    "title": "Educational Administration & Planning",
    "faculty": "Education",
    "aliases": [
      "ed admin planning"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "educational-foundations",
    "title": "Educational Foundations",
    "faculty": "Education",
    "aliases": [
      "educational foundations"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "curriculum-and-instruction",
    "title": "Curriculum and Instruction",
    "faculty": "Education",
    "aliases": [
      "curriculum instruction"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "educational-technology",
    "title": "Educational Technology",
    "faculty": "Education",
    "aliases": [
      "ed tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "GOV"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, and any two other Science or Social Science subjects."
  },
  {
    "id": "adult-and-non-formal-education",
    "title": "Adult & Non-Formal Education",
    "faculty": "Education",
    "aliases": [
      "adult education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 215,
    "competitiveScoreRange": "205 - 245+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "community-development-and-adult-education",
    "title": "Community Development & Adult Education",
    "faculty": "Education",
    "aliases": [
      "community dev adult ed"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "early-childhood-education",
    "title": "Early Childhood Education",
    "faculty": "Education",
    "aliases": [
      "early childhood",
      "ece"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "BIO"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "primary-education-studies",
    "title": "Primary Education Studies",
    "faculty": "Education",
    "aliases": [
      "primary education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "BIO"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "nursery-and-primary-education",
    "title": "Nursery and Primary Education",
    "faculty": "Education",
    "aliases": [
      "nursery primary education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "LIT",
        "BIO"
      ],
      "defaultCodes": [
        "ECN",
        "LIT"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "special-needs-education",
    "title": "Special Needs Education",
    "faculty": "Education",
    "aliases": [
      "special education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science/Arts subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science, Social Science, or Arts subjects."
  },
  {
    "id": "human-kinetics-and-health-education",
    "title": "Human Kinetics & Health Education",
    "faculty": "Education",
    "aliases": [
      "human kinetics",
      "phe"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science/Arts subjects",
      "allowedCodes": [
        "PHE",
        "GEO",
        "GOV",
        "CHM"
      ],
      "defaultCodes": [
        "PHE",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science, Social Science, or Arts subjects."
  },
  {
    "id": "physical-and-health-education",
    "title": "Physical and Health Education",
    "faculty": "Education",
    "aliases": [
      "physical health education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science/Arts subjects",
      "allowedCodes": [
        "PHE",
        "GEO",
        "GOV"
      ],
      "defaultCodes": [
        "PHE",
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science, Social Science, or Arts subjects."
  },
  {
    "id": "health-education",
    "title": "Health Education",
    "faculty": "Education",
    "aliases": [
      "health education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science subjects",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science subjects."
  },
  {
    "id": "home-economics-and-education",
    "title": "Home Economics & Education",
    "faculty": "Education",
    "aliases": [
      "home economics education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HEC"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Arts subjects",
      "allowedCodes": [
        "BIO",
        "CHM",
        "AGR",
        "ART"
      ],
      "defaultCodes": [
        "BIO",
        "CHM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Home Economics, and any two other Science or Arts subjects."
  },
  {
    "id": "technical-and-vocational-education",
    "title": "Technical & Vocational Education",
    "faculty": "Education",
    "aliases": [
      "tve",
      "technical education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Technical Drawing",
      "allowedCodes": [
        "CHM",
        "BIO",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Technical Drawing."
  },
  {
    "id": "automobile-technology-education",
    "title": "Automobile Technology Education",
    "faculty": "Education",
    "aliases": [
      "auto tech education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Technical Drawing",
      "allowedCodes": [
        "CHM",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Technical Drawing."
  },
  {
    "id": "building-technology-education",
    "title": "Building Technology Education",
    "faculty": "Education",
    "aliases": [
      "building tech education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Geography, or Technical Drawing",
      "allowedCodes": [
        "CHM",
        "GEO",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Geography, or Technical Drawing."
  },
  {
    "id": "electrical-electronics-technology-education",
    "title": "Electrical/Electronics Technology Education",
    "faculty": "Education",
    "aliases": [
      "electrical tech education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Technical Drawing",
      "allowedCodes": [
        "CHM",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Technical Drawing."
  },
  {
    "id": "metalwork-technology-education",
    "title": "Metalwork Technology Education",
    "faculty": "Education",
    "aliases": [
      "metalwork education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Technical Drawing",
      "allowedCodes": [
        "CHM",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Technical Drawing."
  },
  {
    "id": "woodwork-technology-education",
    "title": "Woodwork Technology Education",
    "faculty": "Education",
    "aliases": [
      "woodwork education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Technical Drawing",
      "allowedCodes": [
        "CHM",
        "ART"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Technical Drawing."
  },
  {
    "id": "library-and-information-science-education",
    "title": "Library and Information Science (Education)",
    "faculty": "Education",
    "aliases": [
      "library science education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Arts subjects",
      "allowedCodes": [
        "PHY",
        "CHM",
        "BIO",
        "GOV",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 215,
    "competitiveScoreRange": "205 - 245+",
    "ibassNote": "Requires Use of English, Mathematics, and any two other Science, Arts, or Social Science subjects."
  },
  {
    "id": "environmental-education",
    "title": "Environmental Education",
    "faculty": "Education",
    "aliases": [
      "environmental education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "BIO",
        "CHM",
        "ECN",
        "GOV"
      ],
      "defaultCodes": [
        "BIO",
        "ECN"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Geography, and any two other Science or Social Science subjects."
  },
  {
    "id": "science-education",
    "title": "Science Education",
    "faculty": "Education",
    "aliases": [
      "science education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science subjects."
  },
  {
    "id": "arts-education",
    "title": "Arts Education",
    "faculty": "Education",
    "aliases": [
      "arts education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts subjects."
  },
  {
    "id": "social-science-education",
    "title": "Social Science Education",
    "faculty": "Education",
    "aliases": [
      "social science education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Social Science subjects",
      "allowedCodes": [
        "ECN",
        "GEO",
        "HIS"
      ],
      "defaultCodes": [
        "ECN",
        "GEO"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Government, and any two other Social Science subjects."
  },
  {
    "id": "integrated-science-education",
    "title": "Integrated Science Education",
    "faculty": "Education",
    "aliases": [
      "integrated science education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose 2 from Chemistry, Physics, or Mathematics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "CHM",
        "PHY"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, and any two other Science subjects."
  },
  {
    "id": "clinical-pharmacy",
    "title": "Clinical Pharmacy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "clinical pharm",
      "pharm"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 285,
    "competitiveScoreRange": "275 - 315+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "occupational-therapy",
    "title": "Occupational Therapy",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "occupational therapy",
      "ot"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "medical-physics",
    "title": "Medical Physics",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "medical physics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "PHY",
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Biology",
      "allowedCodes": [
        "CHM",
        "BIO"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Physics, Mathematics, and Chemistry or Biology."
  },
  {
    "id": "toxicology",
    "title": "Toxicology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "toxicology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "virology",
    "title": "Virology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "virology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "immunology",
    "title": "Immunology",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "immunology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM",
      "PHY"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics."
  },
  {
    "id": "epidemiology-and-biostatistics",
    "title": "Epidemiology and Biostatistics",
    "faculty": "Medical & Health Sciences",
    "aliases": [
      "epidemiology",
      "biostatistics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Mathematics or Physics",
      "allowedCodes": [
        "MTH",
        "PHY"
      ],
      "defaultCodes": [
        "MTH"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Mathematics or Physics."
  },
  {
    "id": "aeronautical-and-astronautical-engineering",
    "title": "Aeronautical and Astronautical Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "aeronautical eng",
      "space eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 280,
    "competitiveScoreRange": "270 - 310+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "irrigation-and-drainage-engineering",
    "title": "Irrigation and Drainage Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "irrigation eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Agricultural Science",
      "allowedCodes": [
        "CHM",
        "AGR"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Agricultural Science."
  },
  {
    "id": "textile-science-and-technology",
    "title": "Textile Science and Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "textile tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "information-and-media-technology",
    "title": "Information and Media Technology",
    "faculty": "Engineering & Technology",
    "aliases": [
      "imt",
      "media tech"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Economics, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "ECN",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Economics, or Computer Studies."
  },
  {
    "id": "hardware-and-networking-engineering",
    "title": "Hardware and Networking Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "networking eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "nuclear-engineering",
    "title": "Nuclear Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "nuclear eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 270,
    "competitiveScoreRange": "260 - 300+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "automobile-engineering",
    "title": "Automobile Engineering",
    "faculty": "Engineering & Technology",
    "aliases": [
      "automobile eng",
      "auto eng"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "environmental-science-and-resource-management",
    "title": "Environmental Science and Resource Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "environmental science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Geography, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "GEO",
        "AGR"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Geography, or Agricultural Science."
  },
  {
    "id": "family-nutrition-and-consumer-sciences",
    "title": "Family, Nutrition and Consumer Sciences",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "family nutrition"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Home Economics",
      "allowedCodes": [
        "PHY",
        "MTH",
        "HEC"
      ],
      "defaultCodes": [
        "HEC"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Home Economics."
  },
  {
    "id": "hospitality-and-institutional-management",
    "title": "Hospitality and Institutional Management",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "institutional mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Economics or Home Economics",
      "allowedCodes": [
        "ECN",
        "HEC"
      ],
      "defaultCodes": [
        "HEC"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Economics or Home Economics."
  },
  {
    "id": "crop-and-environmental-protection",
    "title": "Crop and Environmental Protection",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "crop protection"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "AGR"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "seed-science-and-technology",
    "title": "Seed Science and Technology",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "seed science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "MTH",
        "AGR"
      ],
      "defaultCodes": [
        "AGR"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics, Mathematics, or Agricultural Science."
  },
  {
    "id": "apiculture-and-sericulture",
    "title": "Apiculture and Sericulture",
    "faculty": "Agriculture & Environmental",
    "aliases": [
      "beekeeping",
      "apiculture"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CHM",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Agricultural Science",
      "allowedCodes": [
        "PHY",
        "AGR"
      ],
      "defaultCodes": [
        "AGR"
      ]
    },
    "recommendedTargetScore": 215,
    "competitiveScoreRange": "205 - 245+",
    "ibassNote": "Requires Use of English, Chemistry, Biology, and Physics or Agricultural Science."
  },
  {
    "id": "cloud-computing",
    "title": "Cloud Computing",
    "faculty": "Sciences & Computing",
    "aliases": [
      "cloud computing",
      "devops"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Economics, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "ECN",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Economics, or Computer Studies."
  },
  {
    "id": "computer-science-and-mathematics",
    "title": "Computer Science and Mathematics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "csc math"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Economics",
      "allowedCodes": [
        "CHM",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Economics."
  },
  {
    "id": "computer-science-and-economics",
    "title": "Computer Science and Economics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "csc economics"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Chemistry, or Computer Studies",
      "allowedCodes": [
        "PHY",
        "CHM",
        "CMP"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Physics, Chemistry, or Computer Studies."
  },
  {
    "id": "telecommunication-science",
    "title": "Telecommunication Science",
    "faculty": "Sciences & Computing",
    "aliases": [
      "telecom science"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "CMP"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, or Computer Studies."
  },
  {
    "id": "environmental-biology",
    "title": "Environmental Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "env biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Mathematics, or Geography",
      "allowedCodes": [
        "PHY",
        "MTH",
        "GEO"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics, Mathematics, or Geography."
  },
  {
    "id": "molecular-biology",
    "title": "Molecular Biology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "molecular biology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "CHM"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics or Mathematics",
      "allowedCodes": [
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "PHY"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Biology, Chemistry, and Physics or Mathematics."
  },
  {
    "id": "mineralogy-and-mining-geology",
    "title": "Mining Geology",
    "faculty": "Sciences & Computing",
    "aliases": [
      "mining geology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "hydrology-and-water-resources",
    "title": "Hydrology and Water Resources",
    "faculty": "Sciences & Computing",
    "aliases": [
      "hydrology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry or Geography",
      "allowedCodes": [
        "CHM",
        "GEO"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry or Geography."
  },
  {
    "id": "energy-and-petroleum-studies",
    "title": "Energy and Petroleum Studies",
    "faculty": "Sciences & Computing",
    "aliases": [
      "energy studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY",
      "CHM"
    ],
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry."
  },
  {
    "id": "international-studies-and-political-science",
    "title": "International Studies and Political Science",
    "faculty": "Social Sciences",
    "aliases": [
      "isps"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "conflict-and-peace-resolution",
    "title": "Conflict Management and Peace Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "conflict management"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "media-and-communication-studies",
    "title": "Media and Communication Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "media comm"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 265,
    "competitiveScoreRange": "255 - 295+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "local-government-administration",
    "title": "Local Government Administration",
    "faculty": "Social Sciences",
    "aliases": [
      "lga admin"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "GEO",
        "COM"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "environmental-geography",
    "title": "Geography and Environmental Management",
    "faculty": "Social Sciences",
    "aliases": [
      "gem",
      "environmental geography"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GEO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science or Social Science subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "GOV",
        "BIO"
      ],
      "defaultCodes": [
        "MTH",
        "ECN"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Geography, and any two other Science or Social Science subjects."
  },
  {
    "id": "forensic-accounting-and-audit",
    "title": "Forensic Accounting and Audit",
    "faculty": "Management & Commercial",
    "aliases": [
      "forensic accounting",
      "audit"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Principles of Accounting, Commerce, or Government",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "investment-and-portfolio-management",
    "title": "Investment and Portfolio Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "investment mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Principles of Accounting, Commerce, or Government",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "commerce-and-cooperative-management",
    "title": "Commerce",
    "faculty": "Management & Commercial",
    "aliases": [
      "commerce",
      "trade"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Commerce, Principles of Accounting, or Government",
      "allowedCodes": [
        "COM",
        "ACC",
        "GOV"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Commerce, Principles of Accounting, or Government."
  },
  {
    "id": "aviation-management",
    "title": "Aviation Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "aviation mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Geography, Physics, or Commerce",
      "allowedCodes": [
        "GEO",
        "PHY",
        "COM"
      ],
      "defaultCodes": [
        "GEO"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Geography, Physics, or Commerce."
  },
  {
    "id": "agribusiness-and-financial-management",
    "title": "Agribusiness and Financial Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "agribusiness finance"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Agricultural Science, Principles of Accounting, or Commerce",
      "allowedCodes": [
        "AGR",
        "ACC",
        "COM"
      ],
      "defaultCodes": [
        "AGR"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Agricultural Science, Principles of Accounting, or Commerce."
  },
  {
    "id": "maritime-law-and-security",
    "title": "Maritime and Admiralty Law",
    "faculty": "Law",
    "aliases": [
      "maritime law",
      "admiralty law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "ECN",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "constitutional-and-administrative-law",
    "title": "Constitutional and Administrative Law",
    "faculty": "Law",
    "aliases": [
      "constitutional law"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 275,
    "competitiveScoreRange": "265 - 310+",
    "ibassNote": "Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
  },
  {
    "id": "criminology-and-penology",
    "title": "Criminology and Penology",
    "faculty": "Law",
    "aliases": [
      "penology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "LIT",
        "ECN",
        "HIS",
        "CRK",
        "IRS"
      ],
      "defaultCodes": [
        "LIT",
        "HIS"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Government, and any two Arts or Social Science subjects."
  },
  {
    "id": "creative-writing-and-literary-arts",
    "title": "Creative Writing",
    "faculty": "Arts & Humanities",
    "aliases": [
      "creative writing"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "CRK",
        "IRS",
        "FRN"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other Arts or Social Science subjects."
  },
  {
    "id": "archaeology-and-tourism",
    "title": "Archaeology and Tourism",
    "faculty": "Arts & Humanities",
    "aliases": [
      "archaeology tourism"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "GEO",
        "LIT",
        "ECN"
      ],
      "defaultCodes": [
        "GEO",
        "GOV"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "comparative-religious-studies",
    "title": "Comparative Religious Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "comparative religion"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "CRK"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts subjects",
      "allowedCodes": [
        "IRS",
        "GOV",
        "HIS",
        "LIT"
      ],
      "defaultCodes": [
        "GOV",
        "HIS"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Christian Religious Knowledge or Islamic Religious Studies, and any two other Arts subjects."
  },
  {
    "id": "diplomatic-studies",
    "title": "Diplomatic Studies",
    "faculty": "Arts & Humanities",
    "aliases": [
      "diplomatic studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HIS"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "LIT",
        "FRN",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 250,
    "competitiveScoreRange": "240 - 280+",
    "ibassNote": "Requires Use of English, History, and any two other Arts or Social Science subjects."
  },
  {
    "id": "education-and-commerce",
    "title": "Education & Commerce",
    "faculty": "Education",
    "aliases": [
      "commerce education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "COM"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Social Science or Commercial subjects",
      "allowedCodes": [
        "MTH",
        "ECN",
        "ACC",
        "GOV"
      ],
      "defaultCodes": [
        "MTH",
        "ECN"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Commerce, and any two other Social Science or Commercial subjects."
  },
  {
    "id": "education-and-civic-education",
    "title": "Civic and Citizenship Education",
    "faculty": "Education",
    "aliases": [
      "civic education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "HIS",
        "ECN",
        "CRK",
        "IRS",
        "LIT"
      ],
      "defaultCodes": [
        "HIS",
        "ECN"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Government, and any two other Arts or Social Science subjects."
  },
  {
    "id": "vocational-and-technical-education",
    "title": "Vocational and Technical Education",
    "faculty": "Education",
    "aliases": [
      "vocational education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Science, Vocational, or Social Science subjects",
      "allowedCodes": [
        "PHY",
        "CHM",
        "AGR",
        "HEC",
        "ECN"
      ],
      "defaultCodes": [
        "PHY",
        "CHM"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Mathematics, and any two Science, Vocational, or Social Science subjects."
  },
  {
    "id": "computer-education",
    "title": "Computer Education",
    "faculty": "Education",
    "aliases": [
      "computer education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "PHY"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Biology, Economics, or Computer Studies",
      "allowedCodes": [
        "CHM",
        "BIO",
        "ECN",
        "CMP"
      ],
      "defaultCodes": [
        "CMP"
      ]
    },
    "recommendedTargetScore": 235,
    "competitiveScoreRange": "225 - 265+",
    "ibassNote": "Requires Use of English, Mathematics, Physics, and Chemistry, Biology, Economics, or Computer Studies."
  },
  {
    "id": "agricultural-technology-education",
    "title": "Agricultural Technology Education",
    "faculty": "Education",
    "aliases": [
      "agric tech education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "AGR",
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Physics, or Mathematics",
      "allowedCodes": [
        "CHM",
        "PHY",
        "MTH"
      ],
      "defaultCodes": [
        "CHM"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Agricultural Science, Biology, and Chemistry, Physics, or Mathematics."
  },
  {
    "id": "educational-psychology-and-counselling",
    "title": "Educational Psychology, Guidance and Counselling",
    "faculty": "Education",
    "aliases": [
      "educational psychology"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts, Science, or Social Science subjects",
      "allowedCodes": [
        "BIO",
        "ECN",
        "LIT",
        "HIS"
      ],
      "defaultCodes": [
        "BIO",
        "ECN"
      ]
    },
    "recommendedTargetScore": 230,
    "competitiveScoreRange": "220 - 260+",
    "ibassNote": "Requires Use of English, Government, and any two Arts, Science, or Social Science subjects."
  },
  {
    "id": "sports-science-and-coaching",
    "title": "Sports Science and Coaching Education",
    "faculty": "Education",
    "aliases": [
      "sports science",
      "coaching"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO",
      "PHE"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Chemistry, Physics, or Government",
      "allowedCodes": [
        "CHM",
        "PHY",
        "GOV"
      ],
      "defaultCodes": [
        "GOV"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Biology, Physical and Health Education, and Chemistry, Physics, or Government."
  },
  {
    "id": "childhood-and-elementary-education",
    "title": "Childhood and Elementary Education",
    "faculty": "Education",
    "aliases": [
      "elementary education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts, Science, or Social Science subjects",
      "allowedCodes": [
        "GOV",
        "HIS",
        "BIO",
        "ECN"
      ],
      "defaultCodes": [
        "GOV",
        "BIO"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Literature in English, and any two other subjects."
  },
  {
    "id": "adult-and-community-development-education",
    "title": "Adult and Community Education",
    "faculty": "Education",
    "aliases": [
      "adult community education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 215,
    "competitiveScoreRange": "205 - 245+",
    "ibassNote": "Requires Use of English, Government, and any two Arts or Social Science subjects."
  },
  {
    "id": "home-economics-and-food-management-education",
    "title": "Home Economics and Hospitality Education",
    "faculty": "Education",
    "aliases": [
      "hospitality education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "HEC"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 from Biology, Chemistry, Agricultural Science, or Economics",
      "allowedCodes": [
        "BIO",
        "CHM",
        "AGR",
        "ECN"
      ],
      "defaultCodes": [
        "BIO",
        "ECN"
      ]
    },
    "recommendedTargetScore": 220,
    "competitiveScoreRange": "210 - 250+",
    "ibassNote": "Requires Use of English, Home Economics, and any two of Biology, Chemistry, Agricultural Science, or Economics."
  },
  {
    "id": "special-education-and-rehabilitation-sciences",
    "title": "Special Education and Rehabilitation Sciences",
    "faculty": "Education",
    "aliases": [
      "rehabilitation education"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "BIO"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 from Government, Literature in English, Economics, or History",
      "allowedCodes": [
        "GOV",
        "LIT",
        "ECN",
        "HIS"
      ],
      "defaultCodes": [
        "GOV",
        "LIT"
      ]
    },
    "recommendedTargetScore": 225,
    "competitiveScoreRange": "215 - 255+",
    "ibassNote": "Requires Use of English, Biology, and any two Arts or Social Science subjects."
  },
  {
    "id": "peace-and-development-studies",
    "title": "Peace and Development Studies",
    "faculty": "Social Sciences",
    "aliases": [
      "peace dev studies"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "GOV"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 Arts or Social Science subjects",
      "allowedCodes": [
        "ECN",
        "HIS",
        "LIT",
        "GEO"
      ],
      "defaultCodes": [
        "ECN",
        "HIS"
      ]
    },
    "recommendedTargetScore": 240,
    "competitiveScoreRange": "230 - 270+",
    "ibassNote": "Requires Use of English, Government, and any two Arts or Social Science subjects."
  },
  {
    "id": "taxation-and-fiscal-policy",
    "title": "Taxation and Fiscal Policy",
    "faculty": "Management & Commercial",
    "aliases": [
      "fiscal policy"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Principles of Accounting, Commerce, or Government",
      "allowedCodes": [
        "ACC",
        "COM",
        "GOV"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Principles of Accounting, Commerce, or Government."
  },
  {
    "id": "supply-chain-and-operations-management",
    "title": "Supply Chain and Operations Management",
    "faculty": "Management & Commercial",
    "aliases": [
      "supply chain",
      "operations mgt"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Commerce, Principles of Accounting, or Geography",
      "allowedCodes": [
        "COM",
        "ACC",
        "GEO"
      ],
      "defaultCodes": [
        "COM"
      ]
    },
    "recommendedTargetScore": 245,
    "competitiveScoreRange": "235 - 275+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Commerce, Principles of Accounting, or Geography."
  },
  {
    "id": "digital-media-and-journalism",
    "title": "Digital Media and Communication",
    "faculty": "Social Sciences",
    "aliases": [
      "digital media",
      "new media"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "LIT"
    ],
    "flexibleSlot": {
      "pickCount": 2,
      "slotLabel": "Choose any 2 from Government, Economics, History, or Computer Studies",
      "allowedCodes": [
        "GOV",
        "ECN",
        "HIS",
        "CMP"
      ],
      "defaultCodes": [
        "GOV",
        "ECN"
      ]
    },
    "recommendedTargetScore": 260,
    "competitiveScoreRange": "250 - 290+",
    "ibassNote": "Requires Use of English, Literature in English, and any two of Government, Economics, History, or Computer Studies."
  },
  {
    "id": "actuarial-and-financial-mathematics",
    "title": "Financial Mathematics",
    "faculty": "Sciences & Computing",
    "aliases": [
      "financial math"
    ],
    "compulsoryCode": "ENG",
    "coreElectiveCodes": [
      "MTH",
      "ECN"
    ],
    "flexibleSlot": {
      "pickCount": 1,
      "slotLabel": "Choose 1 from Physics, Principles of Accounting, or Commerce",
      "allowedCodes": [
        "PHY",
        "ACC",
        "COM"
      ],
      "defaultCodes": [
        "ACC"
      ]
    },
    "recommendedTargetScore": 255,
    "competitiveScoreRange": "245 - 285+",
    "ibassNote": "Requires Use of English, Mathematics, Economics, and Physics, Principles of Accounting, or Commerce."
  }
] as const;

/**
 * Look up the exact canonical database subject name for a 3-letter subject code.
 */
export function getSubjectNameByCode(code: CanonicalSubjectCode): CanonicalSubjectName {
  return CANONICAL_JAMB_SUBJECTS[code];
}

/**
 * Look up a course combination by its URL-safe slug ID.
 */
export function getCourseById(courseId: string): JambCourseCombination | undefined {
  const normalized = courseId.trim().toLowerCase();
  return JAMB_COURSE_COMBINATIONS.find((course) => course.id === normalized);
}

/**
 * Resolves the 3 elective subjects for a given course, validating any custom flexible codes
 * against the course's allowedCodes and falling back to defaultCodes as needed.
 */
export function resolveCourseElectives(
  course: JambCourseCombination,
  chosenFlexibleCodes?: readonly string[]
): ResolvedCourseCombination {
  const coreSet = new Set<CanonicalSubjectCode>(course.coreElectiveCodes);
  const electives: ResolvedElectiveSubject[] = course.coreElectiveCodes.map((code) => ({
    code,
    name: CANONICAL_JAMB_SUBJECTS[code],
    isCore: true,
  }));

  const selectedFlexibleCodes: CanonicalSubjectCode[] = [];

  if (course.flexibleSlot && course.flexibleSlot.pickCount > 0) {
    const allowedSet = new Set<CanonicalSubjectCode>(course.flexibleSlot.allowedCodes);
    const candidateCodes =
      chosenFlexibleCodes && chosenFlexibleCodes.length > 0
        ? chosenFlexibleCodes
        : course.flexibleSlot.defaultCodes;

    for (const rawCode of candidateCodes) {
      const code = rawCode.trim().toUpperCase() as CanonicalSubjectCode;
      if (
        code !== "ENG" &&
        allowedSet.has(code) &&
        !coreSet.has(code) &&
        !selectedFlexibleCodes.includes(code) &&
        selectedFlexibleCodes.length < course.flexibleSlot.pickCount
      ) {
        selectedFlexibleCodes.push(code);
      }
    }

    // If caller passed incomplete or invalid flexible codes, backfill from defaultCodes then allowedCodes
    if (selectedFlexibleCodes.length < course.flexibleSlot.pickCount) {
      for (const fallbackCode of [
        ...course.flexibleSlot.defaultCodes,
        ...course.flexibleSlot.allowedCodes,
      ]) {
        if (
          !coreSet.has(fallbackCode) &&
          !selectedFlexibleCodes.includes(fallbackCode) &&
          selectedFlexibleCodes.length < course.flexibleSlot.pickCount
        ) {
          selectedFlexibleCodes.push(fallbackCode);
        }
      }
    }

    for (const flexCode of selectedFlexibleCodes) {
      electives.push({
        code: flexCode,
        name: CANONICAL_JAMB_SUBJECTS[flexCode],
        isCore: false,
      });
    }
  }

  const electiveCodes = electives.map((item) => item.code);
  const electiveNames = electives.map((item) => item.name);
  const uniqueCodes = new Set(electiveCodes);

  return {
    compulsory: {
      code: "ENG",
      name: "Use of English",
    },
    electives,
    electiveCodes,
    electiveNames,
    selectedFlexibleCodes,
    isComplete: electives.length === 3 && uniqueCodes.size === 3 && !uniqueCodes.has("ENG"),
  };
}

function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Searches and ranks the 427 JAMB course combinations by title, aliases, faculty, and subject names.
 */
export function searchCourseCombinations(
  query: string,
  faculty: CourseFaculty | "All" | "Popular" = "All"
): JambCourseCombination[] {
  const popularOrder = new Map<string, number>(
    POPULAR_COURSE_IDS.map((id, index) => [id, index])
  );

  let pool: JambCourseCombination[] = [...JAMB_COURSE_COMBINATIONS];
  if (faculty === "Popular") {
    const popularItems = pool.filter((course) => popularOrder.has(course.id));
    popularItems.sort(
      (a, b) => (popularOrder.get(a.id) ?? 999) - (popularOrder.get(b.id) ?? 999)
    );
    pool = popularItems;
  } else if (faculty !== "All") {
    pool = pool.filter((course) => course.faculty === faculty);
  }

  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    if (faculty === "All") {
      // Surface popular courses first when no query is active, followed by alphabetical order
      return [...pool].sort((a, b) => {
        const aPop = popularOrder.get(a.id);
        const bPop = popularOrder.get(b.id);
        if (aPop !== undefined && bPop !== undefined) return aPop - bPop;
        if (aPop !== undefined) return -1;
        if (bPop !== undefined) return 1;
        return a.title.localeCompare(b.title);
      });
    }
    return pool;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  const scored: Array<{ course: JambCourseCombination; score: number }> = [];

  for (const course of pool) {
    const normTitle = normalizeQuery(course.title);
    const normId = normalizeQuery(course.id.replace(/-/g, " "));
    const normAliases = course.aliases.map((alias) => normalizeQuery(alias));
    const normFaculty = normalizeQuery(course.faculty);

    let score = 0;

    // 1. Exact title or alias match
    if (normTitle === normalizedQuery || normId === normalizedQuery) {
      score += 1000;
    } else if (normAliases.some((alias) => alias === normalizedQuery)) {
      score += 950;
    }

    // 2. Prefix match on title or alias
    if (normTitle.startsWith(normalizedQuery)) {
      score += 600;
    } else if (normAliases.some((alias) => alias.startsWith(normalizedQuery))) {
      score += 550;
    }

    // 3. Whole-word match in title or aliases
    const wordsInTitle = normTitle.split(" ");
    if (wordsInTitle.includes(normalizedQuery)) {
      score += 450;
    }
    for (const alias of normAliases) {
      if (alias.split(" ").includes(normalizedQuery)) {
        score += 400;
      }
    }

    // 4. Substring match in title/aliases
    if (normTitle.includes(normalizedQuery)) {
      score += 200;
    }
    if (normAliases.some((alias) => alias.includes(normalizedQuery))) {
      score += 180;
    }

    // 5. Multi-token matching across title + aliases + faculty
    const combinedSearchable = [normTitle, ...normAliases, normFaculty].join(" ");
    let matchedTokens = 0;
    let titleTokenMatches = 0;

    for (const token of queryTokens) {
      if (normTitle.split(" ").some((w) => w.startsWith(token))) {
        matchedTokens++;
        titleTokenMatches += 2;
      } else if (normAliases.some((alias) => alias.split(" ").some((w) => w.startsWith(token)))) {
        matchedTokens++;
        titleTokenMatches += 1.5;
      } else if (combinedSearchable.includes(token)) {
        matchedTokens++;
      }
    }

    if (matchedTokens === queryTokens.length) {
      score += 200 + titleTokenMatches * 40;
    } else if (matchedTokens > 0 && queryTokens.length > 1) {
      const ratio = matchedTokens / queryTokens.length;
      if (ratio >= 0.66) {
        score += Math.round(ratio * 90);
      }
    }

    if (score > 0) {
      if (popularOrder.has(course.id)) {
        score += 15;
      }
      scored.push({ course, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.course.title.localeCompare(b.course.title);
  });

  return scored.map((entry) => entry.course);
}
