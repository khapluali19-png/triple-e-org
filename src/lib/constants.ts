import { 
  CategoryInfo, 
  WebsiteBrandingConfig, 
  SocialLinksConfig, 
  SheetConnectionConfig, 
  CompetitionRule 
} from "./types";

export const DEFAULT_BRANDING: WebsiteBrandingConfig = {
  organizationName: "Triple E Organization",
  organizationTagline: "Education · Empowerment · Environment",
  organizationRegion: "District Ghanche, Gilgit-Baltistan",
  motto: "Promoting Education, Empowerment, and Environment through learning, knowledge, and healthy academic competition in District Ghanche, Gilgit-Baltistan.",
  competitionTitle: "Triple E Organization 2nd Quiz Competition",
  competitionEdition: "2nd Quiz Competition",
  mainHeadline: "Celebrating Knowledge.\nInspiring Young Minds.",
  mainSubtitle: "Triple E Organization • 2nd Quiz Competition",
  competitionDescription: "An initiative by Triple E Organization, promoting Education, Empowerment, and Environment through learning, knowledge, and healthy academic competition in District Ghanche, Gilgit-Baltistan.",
  logoUrl: "/images/logos/triple-e-logo.jpg",
  heroImageUrl: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
  announcementText: "Triple E Organization 2nd Quiz Competition • Official Examination Results",
  announcementActive: false,
  resultsPublished: true,
  resultsNotice: "Official scorecards are compiled directly from the competition evaluation board records.",
  footerText: "Promoting Education, Empowerment, and Environment through learning, knowledge, and healthy academic competition in District Ghanche, Gilgit-Baltistan.",
  primaryContactEmail: "",
  primaryContactPhone: "",
  headquartersAddress: "District Ghanche, Gilgit-Baltistan, Pakistan",
  socialLinks: {
    facebook: "https://facebook.com/tripleeorganization",
    whatsapp: "https://wa.me/923000000000",
    youtube: "https://youtube.com/@tripleeorganization",
    instagram: "https://instagram.com/tripleeorg",
    linkedin: "https://linkedin.com/company/triple-e-org",
    email: "contact@triple-e.org",
    phone: "+92 300 0000000",
    customLinks: [],
  },
  lookupLabels: {
    searchTitle: "Check Competition Results",
    searchSubtitle: "Enter your official 2nd Quiz Competition Roll Number below to inspect your verified academic standing, percentage, and category ranking.",
    inputPlaceholder: "e.g. TE-101, TE-102, 0042...",
    buttonText: "Find Result",
  },
  resultCardLabels: {
    scorecardTitle: "Official Verification Scorecard",
    controllerTitle: "Controller of Examinations",
    remarksTitle: "Verified by Triple-E Examination Committee",
  },
  fieldVisibility: {
    showFatherName: true,
    showSchoolName: true,
    showDistrict: true,
    showClassOrSection: true,
    showRank: true,
    showGrade: true,
    showPassFailStatus: true,
    showSubjectBreakdown: true,
  },
  partnerAttribution: {
    enabled: true,
    tagline: "Designed & Developed by Siachen Mark Agency",
    location: "Islamabad",
    developerCredit: "Basharat Ali | Former Social Media Head, Triple E Organization",
    partnerName: "Siachen Mark Agency",
    partnerRole: "Digital & Technology Partner",
    partnerLogoUrl: "/images/logos/siachen-mark-logo.jpg",
    partnerWebsiteUrl: "https://siachen-mark.vercel.app/",
  },
};

export const PARTNER_INFO = DEFAULT_BRANDING.partnerAttribution;

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "lower",
    title: "Lower Class Category",
    subtitle: "Primary Grade Scholars",
    description: "Designed for young emerging scholars focusing on foundational sciences, general knowledge, basic mathematics, and environmental consciousness.",
    grades: "Primary / Elementary Tiers",
    subjects: ["General Science", "Basic Mathematics", "Environmental Studies", "General Knowledge & Pakistan Studies"],
    totalMarks: 100,
    timeAllowed: "60 Minutes",
    isActive: true,
    colorScheme: "emerald",
  },
  {
    id: "middle",
    title: "Middle Class Category",
    subtitle: "Junior Secondary Scholars",
    description: "Evaluates comprehensive academic understanding, analytical reasoning, scientific concepts, and world geography.",
    grades: "Middle / Junior High Tiers",
    subjects: ["Integrated Sciences (Physics/Chemistry/Biology)", "Mathematics & Logic", "Geography & Current Affairs", "English Comprehension"],
    totalMarks: 100,
    timeAllowed: "75 Minutes",
    isActive: true,
    colorScheme: "navy",
  },
  {
    id: "overall",
    title: "Overall Category",
    subtitle: "Open Academic Championship",
    description: "The premier competitive track combining cumulative academic aptitude, rapid buzzer/written logic, and deep regional and global knowledge.",
    grades: "Comprehensive / Senior Tiers",
    subjects: ["Advanced Science & Tech", "Mathematical Problem Solving", "Global History & Heritage", "Environmental Sustainability"],
    totalMarks: 100,
    timeAllowed: "90 Minutes",
    isActive: true,
    colorScheme: "gold",
  },
];

export const COMPETITION_RULES: CompetitionRule[] = [
  {
    id: "rule-1",
    title: "Standardized Evaluation Protocol",
    detail: "Every participant scorecard is cross-tabulated and double-checked by the Triple E Examination Committee before official entry.",
    iconName: "ShieldCheck",
  },
  {
    id: "rule-2",
    title: "Category-Specific Fair Benchmarking",
    detail: "Scorecards are categorized strictly by academic tier (Lower, Middle, and Overall) to ensure age-appropriate, fair assessment.",
    iconName: "Award",
  },
  {
    id: "rule-3",
    title: "Instant Digital Verification",
    detail: "Students and schools can verify official positions and download or print digital result cards instantly using their designated Roll Number.",
    iconName: "CheckCircle2",
  },
  {
    id: "rule-4",
    title: "Official Record Integrity",
    detail: "All records are synced directly with the master competition ledger managed securely through Google Sheets data pipelines.",
    iconName: "Database",
  },
];

export const DEFAULT_SOCIAL_LINKS: SocialLinksConfig = DEFAULT_BRANDING.socialLinks;

export const DEFAULT_SHEET_CONFIG: SheetConnectionConfig = {
  sheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
  apiKeyConfigured: false,
  serviceAccountConfigured: false,
  selectedRange: "Results!A2:H",
  autoSyncIntervalMinutes: 15,
  lastSyncedAt: null,
  syncStatus: "pending",
  sheetMappings: {
    rollNumberCol: "A",
    studentNameCol: "B",
    schoolNameCol: "C",
    categoryCol: "D",
    marksCol: "E",
    totalMarksCol: "F",
    rankCol: "G",
  },
};

export const CURATED_PHOTOGRAPHY = [
  {
    url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
    title: "Engaged Learning & Teamwork",
    caption: "Students collaborating during group academic competitions and classroom challenges.",
    alt: "Young students actively engaged in academic challenge in a classroom",
  },
  {
    url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1200&q=80",
    title: "Focus and Determination",
    caption: "Concentration and scholarly rigor during written assessment rounds.",
    alt: "Students writing academic examinations and quizzes",
  },
  {
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    title: "Empowering Gilgit-Baltistan Youth",
    caption: "Building a culture of academic curiosity, scientific inquiry, and mutual support.",
    alt: "Classroom of motivated students learning together",
  },
  {
    url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
    title: "Celebration of Scholarly Effort",
    caption: "Recognizing each student's dedication to learning and intellectual growth.",
    alt: "Young student holding educational material with confidence",
  },
];
