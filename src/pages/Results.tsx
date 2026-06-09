import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Brain,
  Heart,
  Stethoscope,
  Bone,
  Eye,
  Activity,
  FileDown,
  MapPin,
  RefreshCw,
  ChevronRight,
  Wind,
  Ear,
  Moon,
  FlaskConical,
  Scale,
  Droplets,
  Smile,
  Dumbbell,
  Sparkles,
  Pill,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  Crown,
  AlertTriangle,
  User,
  Calendar,
  Loader2,
  Zap,
  CheckCircle2,
  ArrowRight,
  Clock,
  TrendingUp,
  Shield,
  Info,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ParticleBackground from "@/components/ui/ParticleBackground";
import { getFirstMeasuresFromLLM, getFallbackFirstMeasures } from "@/services/firstMeasuresApi";
import { analyzeSymptoms, type AIAnalysisResponse, type BodyPartDetail } from "@/services/aiAnalysisApi";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Specialist config: icon, specialty, description (broad + niche)
const SPECIALIST_CONFIG: Record<
  string,
  { icon: LucideIcon; specialty: string; description: string }
> = {
  Rheumatologist: {
    icon: Bone,
    specialty: "Rheumatologist",
    description:
      "Joint pain and morning stiffness suggest musculoskeletal or autoimmune conditions. A rheumatologist specializes in arthritis, lupus, and similar disorders.",
  },
  Cardiologist: {
    icon: Heart,
    specialty: "Cardiologist",
    description:
      "Chest pain or heart palpitations warrant a heart evaluation. A cardiologist specializes in cardiovascular conditions and can rule out serious causes.",
  },
  Neurologist: {
    icon: Brain,
    specialty: "Neurologist",
    description:
      "Headache, numbness, tingling, or dizziness can point to nervous system involvement. A neurologist specializes in brain, spine, and nerve disorders.",
  },
  Pulmonologist: {
    icon: Wind,
    specialty: "Pulmonologist",
    description:
      "Cough or shortness of breath suggests respiratory involvement. A pulmonologist specializes in lungs and breathing disorders.",
  },
  "Sports Medicine": {
    icon: Dumbbell,
    specialty: "Sports Medicine",
    description:
      "Injury with muscle pain often benefits from sports medicine. This niche specialty focuses on exercise-related injuries and recovery.",
  },
  Orthopedic: {
    icon: Bone,
    specialty: "Orthopedic",
    description:
      "Injury or swelling may involve bones, joints, or soft tissue. An orthopedic specialist can evaluate and recommend treatment.",
  },
  Gastroenterologist: {
    icon: Pill,
    specialty: "Gastroenterologist",
    description:
      "Nausea or abdominal pain suggests digestive system involvement. A gastroenterologist specializes in gut, liver, and digestive disorders.",
  },
  Dermatologist: {
    icon: Sparkles,
    specialty: "Dermatologist",
    description:
      "Skin rash or itching points to skin conditions. A dermatologist specializes in skin, hair, and nail disorders.",
  },
  Ophthalmologist: {
    icon: Eye,
    specialty: "Ophthalmologist",
    description:
      "Eye pain or blurred vision warrants an eye exam. An ophthalmologist specializes in vision and eye diseases.",
  },
  ENT: {
    icon: Ear,
    specialty: "ENT (Otolaryngologist)",
    description:
      "Sore throat or ear pain suggests ear, nose, or throat involvement. An ENT specialist treats conditions in these areas.",
  },
  Allergist: {
    icon: Wind,
    specialty: "Allergist / Immunologist",
    description:
      "Allergies or sneezing may need allergy testing and management. An allergist specializes in allergic and immune conditions.",
  },
  Psychiatrist: {
    icon: Smile,
    specialty: "Psychiatrist",
    description:
      "Anxiety or low mood can benefit from mental health evaluation. A psychiatrist specializes in emotional and behavioral health.",
  },
  "Sleep Specialist": {
    icon: Moon,
    specialty: "Sleep Specialist",
    description:
      "Sleep problems affect overall health. A sleep specialist evaluates sleep disorders and can recommend testing or treatment.",
  },
  Physiatrist: {
    icon: Activity,
    specialty: "Physiatrist (PM&R)",
    description:
      "Back pain or muscle pain often benefits from rehabilitation. A physiatrist specializes in physical medicine and rehabilitation.",
  },
  "Infectious Disease": {
    icon: FlaskConical,
    specialty: "Infectious Disease Specialist",
    description:
      "Prolonged fever with respiratory symptoms may need infectious disease evaluation. This niche specialty focuses on complex infections.",
  },
  Urologist: {
    icon: Droplets,
    specialty: "Urologist",
    description:
      "Urinary issues warrant a urology evaluation. A urologist specializes in urinary tract and related conditions.",
  },
  Endocrinologist: {
    icon: Scale,
    specialty: "Endocrinologist",
    description:
      "Weight changes or excessive thirst can signal hormone or metabolic issues. An endocrinologist specializes in diabetes, thyroid, and hormones.",
  },
  "Pain Management": {
    icon: Activity,
    specialty: "Pain Management Specialist",
    description:
      "Chronic pain may benefit from a pain specialist. This niche focuses on comprehensive pain evaluation and treatment.",
  },
  "General Physician": {
    icon: Stethoscope,
    specialty: "General Physician",
    description:
      "Fever, fatigue, or general symptoms are a good fit for a general physician. They can provide initial evaluation and refer to a specialist if needed.",
  },
};

const ALL_SPECIALIST_KEYS = Object.keys(SPECIALIST_CONFIG);

const SPECIALIST_CONDITIONS: Record<string, string[]> = {
  Rheumatologist: ["rheumatoid arthritis", "osteoarthritis", "lupus", "joint disorders", "ankylosing spondylitis"],
  Cardiologist: ["heart disease", "hypertension", "arrhythmia", "heart failure", "angina"],
  Neurologist: ["migraine", "epilepsy", "stroke", "neuropathy", "multiple sclerosis", "Parkinson's"],
  Pulmonologist: ["asthma", "COPD", "pneumonia", "bronchitis", "sleep apnea"],
  "Sports Medicine": ["sports injuries", "muscle strains", "ligament tears", "rehabilitation"],
  Orthopedic: ["fractures", "joint replacement", "arthritis", "tendonitis", "back and joint pain"],
  Gastroenterologist: ["IBS", "GERD", "liver disease", "inflammatory bowel disease", "digestive disorders"],
  Dermatologist: ["skin infections", "eczema", "psoriasis", "acne", "skin cancer screening"],
  Ophthalmologist: ["cataract", "glaucoma", "diabetic retinopathy", "vision disorders"],
  ENT: ["sinusitis", "hearing loss", "tonsillitis", "ear infections", "sleep apnea"],
  Allergist: ["allergic rhinitis", "asthma", "food allergies", "eczema", "anaphylaxis"],
  Psychiatrist: ["depression", "anxiety", "bipolar disorder", "PTSD", "schizophrenia"],
  "Sleep Specialist": ["insomnia", "sleep apnea", "narcolepsy", "restless leg syndrome"],
  Physiatrist: ["chronic pain", "rehabilitation", "spinal cord injury", "stroke rehabilitation"],
  "Infectious Disease": ["tuberculosis", "HIV", "hepatitis", "complex infections", "travel medicine"],
  Urologist: ["kidney stones", "UTI", "benign prostate enlargement", "urological cancers"],
  Endocrinologist: ["diabetes", "thyroid disorders", "hormone imbalances", "osteoporosis"],
  "Pain Management": ["chronic pain", "fibromyalgia", "neuropathic pain", "cancer pain"],
  "General Physician": ["general health check-up", "fever", "infections", "chronic disease management"],
};

const GOVERNMENT_SCHEMES = [
  {
    id: "ayushman-bharat",
    name: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana",
    shortName: "AB-PMJAY",
    description: "National health protection scheme providing cashless coverage for secondary and tertiary care hospitalization.",
    eligibilitySummary: "Eligible families (based on SECC) get coverage of ₹5 lakh per family per year.",
    coveredSpecialists: ALL_SPECIALIST_KEYS,
    officialUrl: "https://pmjay.gov.in",
  },
  {
    id: "cghs",
    name: "Central Government Health Scheme",
    shortName: "CGHS",
    description: "Health coverage for central government employees and pensioners including OPD and hospitalization.",
    eligibilitySummary: "Central govt. employees, pensioners, and their dependents.",
    coveredSpecialists: ALL_SPECIALIST_KEYS,
    officialUrl: "https://cghs.gov.in",
  },
];

type GovernmentScheme = (typeof GOVERNMENT_SCHEMES)[number];

function getSchemesForSpecialist(specialistKey: string): GovernmentScheme[] {
  return GOVERNMENT_SCHEMES.filter((scheme) =>
    scheme.coveredSpecialists.includes(specialistKey)
  );
}

const SYMPTOM_SYNONYMS: Record<string, string[]> = {
  "joint pain": ["joint pain", "joint ache", "achy joints", "sore joints", "joint stiffness", "arthritis"],
  "morning stiffness": ["morning stiffness", "stiff in the morning", "stiff when i wake"],
  "chest pain": ["chest pain", "chest tightness", "chest discomfort", "pressure in chest"],
  "heart palpitations": ["heart palpitations", "palpitations", "heart racing", "pounding heart"],
  headache: ["headache", "head pain", "head hurts", "migraine"],
  numbness: ["numbness", "numb", "loss of sensation"],
  tingling: ["tingling", "pins and needles", "prickling"],
  dizziness: ["dizziness", "dizzy", "lightheaded", "vertigo"],
  cough: ["cough", "coughing", "hacking"],
  "shortness of breath": ["shortness of breath", "short of breath", "hard to breathe", "breathless"],
  injury: ["injury", "injured", "hurt myself", "sprain", "strain"],
  swelling: ["swelling", "swollen", "puffy", "inflammation"],
  nausea: ["nausea", "nauseous", "queasy", "sick to stomach"],
  "abdominal pain": ["abdominal pain", "stomach pain", "stomach ache", "belly pain"],
  "skin rash": ["skin rash", "rash", "red skin", "breakout", "hives"],
  itching: ["itching", "itchy", "itch", "pruritus"],
  "eye pain": ["eye pain", "eyes hurt", "sore eyes"],
  "blurred vision": ["blurred vision", "blurry vision", "can't see well"],
  "sore throat": ["sore throat", "throat pain", "throat hurts"],
  "ear pain": ["ear pain", "earache", "ear hurts"],
  allergies: ["allergies", "allergic", "allergy", "runny nose"],
  sneezing: ["sneezing", "sneeze"],
  anxiety: ["anxiety", "anxious", "worried", "nervous", "panic"],
  "low mood": ["low mood", "depressed", "depression", "sad", "down"],
  "sleep problems": ["sleep problems", "can't sleep", "insomnia", "trouble sleeping"],
  "back pain": ["back pain", "backache", "lower back pain", "spine pain"],
  fever: ["fever", "feverish", "high temperature", "chills"],
  fatigue: ["fatigue", "tired", "tiredness", "exhausted", "low energy"],
  "urinary issues": ["urinary issues", "painful urination", "frequent urination"],
  "weight changes": ["weight changes", "weight gain", "weight loss"],
  "excessive thirst": ["excessive thirst", "very thirsty", "thirsty all the time"],
  "muscle pain": ["muscle pain", "muscle ache", "sore muscles"],
};

const SPECIALIST_SYMPTOMS: Record<string, string[]> = {
  Rheumatologist: ["joint pain", "morning stiffness"],
  Cardiologist: ["chest pain", "heart palpitations"],
  Neurologist: ["headache", "numbness", "tingling", "dizziness"],
  Pulmonologist: ["cough", "shortness of breath"],
  "Sports Medicine": ["injury", "muscle pain"],
  Orthopedic: ["injury", "swelling"],
  Gastroenterologist: ["nausea", "abdominal pain"],
  Dermatologist: ["skin rash", "itching"],
  Ophthalmologist: ["eye pain", "blurred vision"],
  ENT: ["sore throat", "ear pain"],
  Allergist: ["allergies", "sneezing"],
  Psychiatrist: ["anxiety", "low mood"],
  "Sleep Specialist": ["sleep problems"],
  Physiatrist: ["back pain", "muscle pain"],
  "Infectious Disease": ["fever", "cough"],
  Urologist: ["urinary issues"],
  Endocrinologist: ["weight changes", "excessive thirst"],
  "Pain Management": ["back pain", "muscle pain", "joint pain"],
  "General Physician": ["fever", "fatigue"],
};

function getRecommendationFromSymptoms(
  symptomsText: string,
  quickSymptomsList: string[]
): {
  primaryRecommendation: { icon: LucideIcon; specialty: string; matchPercentage: number; description: string };
  primarySpecialtyKey: string;
  alternatives: Array<{ icon: LucideIcon; specialty: string; matchPercentage: number; description: string }>;
  reasoning: string[];
  urgency: "low" | "moderate" | "high";
  urgencyPercentage: number;
} {
  const text = (symptomsText || "").toLowerCase();
  const quick = quickSymptomsList || [];
  const quickNormalized = new Set(quick.map((s) => s.toLowerCase().trim()));

  const has = (keyword: string): boolean => {
    const k = keyword.toLowerCase();
    if (quickNormalized.has(k)) return true;
    if (text.includes(k)) return true;
    const synonyms = SYMPTOM_SYNONYMS[k];
    if (synonyms) {
      for (const syn of synonyms) {
        if (text.includes(syn.toLowerCase())) return true;
      }
    }
    return false;
  };

  const countMatchedSymptoms = (specialistKey: string): number => {
    const symptoms = SPECIALIST_SYMPTOMS[specialistKey];
    if (!symptoms) return 0;
    let count = 0;
    for (const s of symptoms) {
      if (has(s)) count++;
    }
    return count;
  };

  const getMatchPercentage = (specialistKey: string, isPrimary: boolean): number => {
    const symptoms = SPECIALIST_SYMPTOMS[specialistKey];
    const total = symptoms?.length ?? 1;
    const matched = countMatchedSymptoms(specialistKey);
    const ratio = total > 0 ? matched / total : 0;
    const base = isPrimary ? 78 : 50;
    const range = isPrimary ? 22 : 45;
    return Math.min(99, Math.max(40, Math.round(base + ratio * range)));
  };

  const matched: string[] = [];
  const add = (key: string) => { if (!matched.includes(key)) matched.push(key); };

  if (has("joint pain") && has("morning stiffness")) add("Rheumatologist");
  if (has("chest pain") || has("heart palpitations")) add("Cardiologist");
  if (has("headache") && (has("numbness") || has("tingling"))) add("Neurologist");
  if (has("cough") || has("shortness of breath")) add("Pulmonologist");
  if (has("injury") && has("muscle pain")) add("Sports Medicine");
  if (has("injury") || has("swelling")) add("Orthopedic");
  if (has("nausea") || has("abdominal pain")) add("Gastroenterologist");
  if (has("skin rash") || has("itching")) add("Dermatologist");
  if (has("eye pain") || has("blurred vision")) add("Ophthalmologist");
  if (has("sore throat") || has("ear pain")) add("ENT");
  if (has("allergies") || has("sneezing")) add("Allergist");
  if (has("anxiety") || has("low mood")) add("Psychiatrist");
  if (has("sleep problems")) add("Sleep Specialist");
  if (has("back pain")) add("Physiatrist");
  if (has("dizziness") || has("numbness") || has("tingling")) add("Neurologist");
  if (has("fever") && has("cough")) add("Infectious Disease");
  if (has("fever") || has("fatigue")) add("General Physician");
  if (has("urinary issues")) add("Urologist");
  if (has("weight changes") || has("excessive thirst")) add("Endocrinologist");
  if (has("muscle pain")) add("Physiatrist");

  const primaryKey = matched[0] || "General Physician";
  const primaryConfig = SPECIALIST_CONFIG[primaryKey];
  const reasoning: string[] = [];

  if (matched.length === 0) {
    reasoning.push("Based on your symptoms, a General Physician can provide initial evaluation.");
  } else {
    reasoning.push(`Your symptoms indicate ${primaryConfig.specialty} may be the best fit.`);
    reasoning.push("Analysis based on symptom matching and medical guidelines.");
  }

  const pool = ALL_SPECIALIST_KEYS.filter((s) => s !== primaryKey);
  const altKeys = [...matched.slice(1), ...pool.filter((s) => !matched.includes(s))].slice(0, 4);
  const alternativesList = altKeys.map((key) => {
    const c = SPECIALIST_CONFIG[key];
    if (!c) return null;
    return {
      icon: c.icon,
      specialty: c.specialty,
      matchPercentage: getMatchPercentage(key, false),
      description: c.description,
    };
  }).filter(Boolean) as Array<{ icon: LucideIcon; specialty: string; matchPercentage: number; description: string }>;

  const urgency: "low" | "moderate" | "high" = has("chest pain") || has("shortness of breath") ? "high" : matched.length > 0 ? "moderate" : "low";
  const urgencyPercentage = urgency === "high" ? 85 : urgency === "moderate" ? 60 : 40;

  return {
    primaryRecommendation: {
      icon: primaryConfig.icon,
      specialty: primaryConfig.specialty,
      matchPercentage: getMatchPercentage(primaryKey, true),
      description: primaryConfig.description,
    },
    primarySpecialtyKey: primaryKey,
    alternatives: alternativesList,
    reasoning,
    urgency,
    urgencyPercentage,
  };
}

function getSpecialtyIcon(specialty: string): LucideIcon {
  const specialtyLower = specialty.toLowerCase();
  if (specialtyLower.includes("cardio") || specialtyLower.includes("heart")) return Heart;
  if (specialtyLower.includes("neuro") || specialtyLower.includes("brain")) return Brain;
  if (specialtyLower.includes("pulmo") || specialtyLower.includes("lung")) return Wind;
  if (specialtyLower.includes("ortho") || specialtyLower.includes("bone")) return Bone;
  if (specialtyLower.includes("gastro") || specialtyLower.includes("stomach")) return Pill;
  if (specialtyLower.includes("ophthal") || specialtyLower.includes("eye")) return Eye;
  if (specialtyLower.includes("ent") || specialtyLower.includes("ear")) return Ear;
  if (specialtyLower.includes("derma") || specialtyLower.includes("skin")) return Sparkles;
  if (specialtyLower.includes("psych") || specialtyLower.includes("mental")) return Smile;
  if (specialtyLower.includes("endocrin")) return Scale;
  if (specialtyLower.includes("urolog")) return Droplets;
  if (specialtyLower.includes("rheumat")) return Bone;
  if (specialtyLower.includes("sleep")) return Moon;
  if (specialtyLower.includes("infectious")) return FlaskConical;
  if (specialtyLower.includes("sport")) return Dumbbell;
  if (specialtyLower.includes("pain")) return Activity;
  return Stethoscope;
}

interface LocationState {
  symptoms?: string;
  quickSymptoms?: string[];
  bodyParts?: string[];
  bodyPartsDetailed?: BodyPartDetail[];
  age?: number;
  gender?: string;
  medications?: string[];
}

const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_BODY_PARTS: BodyPartDetail[] = [];

const Results = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [firstMeasures, setFirstMeasures] = useState<string | null>(null);
  const [firstMeasuresLoading, setFirstMeasuresLoading] = useState(true);
  const [firstMeasuresFromAI, setFirstMeasuresFromAI] = useState(false);
  const [talkToNurseOpen, setTalkToNurseOpen] = useState(false);
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);

  const state = location.state as LocationState | null;
  const symptomsText = state?.symptoms ?? "";
  const quickSymptomsList = state?.quickSymptoms ?? EMPTY_STRING_ARRAY;
  const bodyPartsDetailed = state?.bodyPartsDetailed ?? EMPTY_BODY_PARTS;
  const age = state?.age ?? 30;
  const gender = state?.gender ?? "";
  const medications = state?.medications ?? EMPTY_STRING_ARRAY;
  const reportTexts = (state as any)?.reportTexts ?? EMPTY_STRING_ARRAY;
  
  const ruleBasedResults = getRecommendationFromSymptoms(symptomsText, quickSymptomsList);

  const currentLanguage = i18n.language || 'en';

  // AI Analysis effect
  useEffect(() => {
    if (!useAI) {
      setAiLoading(false);
      return;
    }

    const hasAnyInput =
      Boolean(symptomsText?.trim()) ||
      quickSymptomsList.length > 0 ||
      bodyPartsDetailed.length > 0;
    if (!hasAnyInput) {
      setUseAI(false);
      setAiLoading(false);
      return;
    }

    let cancelled = false;
    setAiLoading(true);
    setAiError(null);

    analyzeSymptoms({
      symptoms: symptomsText,
      quickSymptoms: quickSymptomsList,
      bodyParts: bodyPartsDetailed,
      age,
      gender,
      medications,
      language: currentLanguage,
      reportTexts: reportTexts.length > 0 ? reportTexts : undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setAiAnalysis(response);
        setAiLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("AI analysis error:", error);
        setAiError(error.message || "AI analysis failed");
        setAiLoading(false);
        setUseAI(false);
      });

    return () => { cancelled = true; };
  }, [useAI, symptomsText, quickSymptomsList, bodyPartsDetailed, age, gender, medications, currentLanguage]);

  // First measures effect
  useEffect(() => {
    let cancelled = false;
    setFirstMeasuresLoading(true);
    getFirstMeasuresFromLLM(symptomsText, quickSymptomsList, currentLanguage).then((out) => {
      if (cancelled) return;
      if ("text" in out) {
        setFirstMeasures(out.text);
        setFirstMeasuresFromAI(true);
      } else {
        setFirstMeasures(getFallbackFirstMeasures(symptomsText, quickSymptomsList));
        setFirstMeasuresFromAI(false);
      }
      setFirstMeasuresLoading(false);
    });
    return () => { cancelled = true; };
  }, [symptomsText, quickSymptomsList, currentLanguage]);

  // Compute display results
  const results = useAI && aiAnalysis 
    ? {
        primaryRecommendation: {
          icon: getSpecialtyIcon(aiAnalysis.primaryRecommendation.specialty),
          specialty: aiAnalysis.primaryRecommendation.specialty,
          matchPercentage: aiAnalysis.primaryRecommendation.matchPercentage,
          description: aiAnalysis.primaryRecommendation.reasoning,
        },
        primarySpecialtyKey: aiAnalysis.primaryRecommendation.specialty,
        alternatives: aiAnalysis.alternatives.map((alt) => ({
          icon: getSpecialtyIcon(alt.specialty),
          specialty: alt.specialty,
          matchPercentage: alt.matchPercentage,
          description: alt.reasoning,
        })),
        reasoning: [
          aiAnalysis.primaryRecommendation.reasoning,
          ...(aiAnalysis.ageSpecificConsiderations ? [aiAnalysis.ageSpecificConsiderations] : []),
          ...(aiAnalysis.genderSpecificConsiderations ? [aiAnalysis.genderSpecificConsiderations] : []),
        ],
        urgency: aiAnalysis.primaryRecommendation.urgencyLevel === "emergency" 
          ? "high" as const 
          : aiAnalysis.primaryRecommendation.urgencyLevel as "low" | "moderate" | "high",
        urgencyPercentage: aiAnalysis.urgencyPercentage,
      }
    : ruleBasedResults;

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGeneratingPDF(false);
    alert("PDF Report Generated! (Demo)");
  };

  const urgencyKey = results.urgency;
  const urgencyConfig = {
    low: {
      color: "hsl(142, 76%, 45%)",
      bgClass: "bg-success/10",
      borderClass: "border-success/30",
      textClass: "text-success",
    },
    moderate: {
      color: "hsl(38, 92%, 50%)",
      bgClass: "bg-warning/10",
      borderClass: "border-warning/30",
      textClass: "text-warning",
    },
    high: {
      color: "hsl(0, 84%, 60%)",
      bgClass: "bg-destructive/10",
      borderClass: "border-destructive/30",
      textClass: "text-destructive",
    },
  };

  const urgencyInfo = urgencyConfig[urgencyKey];
  const Icon = results.primaryRecommendation.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ParticleBackground />

      <main className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="sr-only">{t('results.title')}</h1>
          {/* Status Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnimatePresence mode="wait">
              {aiLoading ? (
                <motion.div
                  key="loading"
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/30"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-primary font-medium">{t('results.aiAnalyzing')}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="complete"
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/30"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-success font-medium">
                    {useAI && aiAnalysis ? t('results.aiComplete') : t('results.analysisComplete')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Patient Context Pills */}
          {!aiLoading && (
            <motion.div
              className="flex flex-wrap justify-center gap-3 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm"><span className="text-muted-foreground">{t('results.age')}:</span> <span className="font-medium">{age}</span></span>
              </div>
              {gender && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm"><span className="text-muted-foreground">{t('results.gender')}:</span> <span className="font-medium capitalize">{gender}</span></span>
                </div>
              )}
              {quickSymptomsList.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm"><span className="text-muted-foreground">{t('results.symptoms')}:</span> <span className="font-medium">{quickSymptomsList.length}</span></span>
                </div>
              )}
            </motion.div>
          )}

          {/* Emergency Flags */}
          {useAI && aiAnalysis && aiAnalysis.emergencyFlags.length > 0 && (
            <motion.div
              className="mb-8 p-5 rounded-2xl bg-destructive/10 border border-destructive/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-destructive text-lg mb-2">{t('results.emergencyDetected')}</h3>
                  <ul className="space-y-1">
                    {aiAnalysis.emergencyFlags.map((flag, index) => (
                      <li key={index} className="text-sm text-destructive/90 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-destructive/80 font-medium">
                    {t('results.emergencyCallMsg')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading Skeleton */}
          {aiLoading && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-card border border-border p-8 animate-pulse">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-muted" />
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="h-6 bg-muted rounded-lg w-48 mx-auto md:mx-0" />
                    <div className="h-4 bg-muted rounded w-full max-w-md mx-auto md:mx-0" />
                    <div className="h-4 bg-muted rounded w-3/4 max-w-sm mx-auto md:mx-0" />
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl bg-card border border-border p-5 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-3 bg-muted rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!aiLoading && (
            <div className="space-y-6">
              {/* Primary Recommendation Card */}
              <motion.div
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <motion.div
                      className="w-24 h-24 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <Icon className="w-12 h-12 text-primary" />
                    </motion.div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                          {t('results.topRecommendation')}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-success/20 text-success text-xs font-semibold">
                          {t('results.matchPercentage', { percentage: results.primaryRecommendation.matchPercentage })}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        {results.primaryRecommendation.specialty}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed max-w-2xl">
                        {results.primaryRecommendation.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-20 h-20 rounded-full ${urgencyInfo.bgClass} ${urgencyInfo.borderClass} border-2 flex flex-col items-center justify-center`}>
                        <span className={`text-2xl font-bold ${urgencyInfo.textClass}`}>
                          {results.urgencyPercentage}%
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${urgencyInfo.textClass}`}>{t(`results.urgency.${urgencyKey}`)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border/50">
                    <Link to="/doctors" className="flex-1 min-w-[200px]">
                      <motion.button
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <MapPin className="w-5 h-5" />
                        {t('results.findNearbySpecialists')}
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </Link>
                    <motion.button
                      onClick={() => setTalkToNurseOpen(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-medium hover:border-primary/50 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MessageCircle className="w-5 h-5 text-primary" />
                      {t('results.talkToNurse')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Alternative Specialists Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {t('results.alternativeSpecialists')}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {results.alternatives.slice(0, 4).map((alt, index) => {
                    const AltIcon = alt.icon;
                    const aiAlt = useAI && aiAnalysis?.alternatives?.find(
                      a => a.specialty.toLowerCase().includes(alt.specialty.toLowerCase().split(' ')[0]) ||
                           alt.specialty.toLowerCase().includes(a.specialty.toLowerCase().split(' ')[0])
                    );
                    const reasoning = aiAlt?.reasoning || alt.description;
                    
                    return (
                      <motion.div
                        key={alt.specialty}
                        className="group relative rounded-xl bg-card border border-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                            <AltIcon className="w-7 h-7 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-foreground truncate">{alt.specialty}</h4>
                              <span className="text-xs font-medium text-primary whitespace-nowrap">{alt.matchPercentage}%</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className="h-full bg-primary rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${alt.matchPercentage}%` }}
                                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">
                              {reasoning}
                            </p>
                            {useAI && (aiAnalysis?.ageSpecificConsiderations || aiAnalysis?.genderSpecificConsiderations) && (
                              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                {aiAnalysis?.ageSpecificConsiderations && (
                                  <div className="flex items-start gap-2">
                                    <User className="w-3.5 h-3.5 text-accent-foreground mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-accent-foreground/80 leading-relaxed">
                                      <span className="font-medium">{t('results.age')}:</span> {aiAnalysis.ageSpecificConsiderations}
                                    </p>
                                  </div>
                                )}
                                {aiAnalysis?.genderSpecificConsiderations && (
                                  <div className="flex items-start gap-2">
                                    <User className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-primary/80 leading-relaxed">
                                      <span className="font-medium">{t('results.gender')}:</span> {aiAnalysis.genderSpecificConsiderations}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* AI Insights Section */}
              {useAI && aiAnalysis && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {aiAnalysis.differentialDiagnosis.length > 0 && (
                      <motion.div
                        className="rounded-xl bg-card border border-border p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                          <FlaskConical className="w-5 h-5 text-primary" />
                          {t('results.possibleConditions')}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">AI</span>
                        </h3>
                        <div className="space-y-2">
                          {aiAnalysis.differentialDiagnosis.slice(0, 5).map((diagnosis, index) => (
                            <motion.div
                              key={index}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + index * 0.05 }}
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">{index + 1}</span>
                              </div>
                              <span className="text-sm text-foreground">{diagnosis}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {aiAnalysis.nextSteps.length > 0 && (
                      <motion.div
                        className="rounded-xl bg-card border border-border p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                          {t('results.recommendedNextSteps')}
                        </h3>
                        <div className="space-y-2">
                          {aiAnalysis.nextSteps.slice(0, 5).map((step, index) => (
                            <motion.div
                              key={index}
                              className="flex items-start gap-3"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.45 + index * 0.05 }}
                            >
                              <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CheckCircle2 className="w-3 h-3 text-success" />
                              </div>
                              <p className="text-sm text-muted-foreground">{step}</p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {(aiAnalysis.ageSpecificConsiderations || aiAnalysis.genderSpecificConsiderations) && (
                    <motion.div
                      className="rounded-xl bg-gradient-to-br from-accent/10 via-card to-primary/5 border border-accent/20 p-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-accent-foreground" />
                        {t('results.personalizedConsiderations')}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">AI</span>
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {aiAnalysis.ageSpecificConsiderations && (
                          <motion.div
                            className="p-4 rounded-lg bg-card/50 border border-border/50"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-primary" />
                              </div>
                              <h4 className="font-medium text-foreground text-sm">{t('results.ageSpecificInsights')}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {aiAnalysis.ageSpecificConsiderations}
                            </p>
                          </motion.div>
                        )}
                        {aiAnalysis.genderSpecificConsiderations && (
                          <motion.div
                            className="p-4 rounded-lg bg-card/50 border border-border/50"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-accent-foreground" />
                              </div>
                              <h4 className="font-medium text-foreground text-sm">{t('results.genderSpecificInsights')}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {aiAnalysis.genderSpecificConsiderations}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* First Measures */}
              <motion.div
                className="rounded-xl bg-card border border-border p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {t('results.firstMeasuresToTake')}
                  {firstMeasuresFromAI && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">AI</span>
                  )}
                </h3>
                {firstMeasuresLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-3 h-3 rounded-full bg-primary/20 animate-pulse" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div
                            className="h-3 rounded-full bg-muted animate-pulse"
                            style={{ width: `${85 - i * 8}%`, animationDelay: `${i * 150}ms` }}
                          />
                          <div
                            className="h-3 rounded-full bg-muted/60 animate-pulse"
                            style={{ width: `${60 - i * 5}%`, animationDelay: `${i * 150 + 75}ms` }}
                          />
                        </div>
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-2 pt-2">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">{t('results.aiAnalyzing')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {firstMeasures || "Rest and stay hydrated. If symptoms worsen, see a doctor."}
                  </div>
                )}
              </motion.div>

              {/* Government Schemes */}
              {(() => {
                const schemes = getSchemesForSpecialist(results.primarySpecialtyKey);
                const conditions = SPECIALIST_CONDITIONS[results.primarySpecialtyKey] ?? [];
                if (schemes.length === 0) return null;
                return (
                  <motion.div
                    className="rounded-xl bg-card border border-border p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      {t('results.governmentSchemes')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('results.conditionsCovered', { conditions: conditions.slice(0, 3).join(", ") })}
                    </p>
                    <div className="grid gap-3">
                      {schemes.map((scheme) => (
                        <motion.div
                          key={scheme.id}
                          className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${
                            expandedScheme === scheme.id 
                              ? "bg-primary/5 border-primary/30" 
                              : "bg-muted/30 border-border hover:border-primary/20"
                          }`}
                          onClick={() => setExpandedScheme(expandedScheme === scheme.id ? null : scheme.id)}
                        >
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-success" />
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground">{scheme.shortName}</h4>
                                <span className="text-xs text-success font-medium">{t('results.covered')}</span>
                              </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expandedScheme === scheme.id ? "rotate-90" : ""}`} />
                          </div>
                          <AnimatePresence>
                            {expandedScheme === scheme.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-0 space-y-2 text-sm">
                                  <p className="text-muted-foreground">{scheme.description}</p>
                                  <p className="text-muted-foreground">
                                    <span className="font-medium text-foreground">{t('results.eligibility')}:</span> {scheme.eligibilitySummary}
                                  </p>
                                  {scheme.officialUrl && (
                                    <a
                                      href={scheme.officialUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {t('results.checkEligibility')} <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Action Buttons */}
              <motion.div
                className="grid sm:grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <motion.button
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-center gap-3 p-4 rounded-xl bg-card border border-border text-foreground hover:border-primary/50 transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileDown className="w-5 h-5 text-primary" />
                  )}
                  <span className="font-medium">{isGeneratingPDF ? t('results.generating') : t('results.downloadReport')}</span>
                </motion.button>

                <Link to="/symptoms" className="block">
                  <motion.button
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span className="font-medium">{t('results.newAnalysis')}</span>
                  </motion.button>
                </Link>
              </motion.div>

              {/* Disclaimer */}
              <motion.div
                className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Info className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-warning/90 leading-relaxed">
                  <strong>{t('results.disclaimerLabel')}:</strong> {t('results.disclaimer')}
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      {/* Talk to Nurse Dialog */}
      <Dialog open={talkToNurseOpen} onOpenChange={setTalkToNurseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-warning" />
              {t('results.premiumFeature')}
            </DialogTitle>
            <DialogDescription>
              {t('results.premiumNurseDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-warning/10 border border-warning/30 p-4">
              <p className="text-sm text-warning/90">
                {t('results.premiumUpgradeMsg')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTalkToNurseOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('results.maybeLater')}
              </button>
              <button className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                {t('results.upgradeNow')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Results;
