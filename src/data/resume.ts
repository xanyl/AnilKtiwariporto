import codePathCertificate from "../../certificates/c8a54026-757f-4b18-bf0c-573033f115b7.pdf?url";
import pythonForDataScienceCertificate from "../../certificates/Coursera MV9KT6C99L6S.pdf?url";
import pythonCapstoneCertificate from "../../certificates/Coursera MARZHTUTPSWZ.pdf?url";
import webDataCertificate from "../../certificates/Coursera J9388Q68FUM6.pdf?url";
import pythonDataStructuresCertificate from "../../certificates/Coursera 3KZV65YFH466.pdf?url";
import programmingForEverybodyCertificate from "../../certificates/Coursera PFA6Q4P9R9YZ.pdf?url";

export const profile = {
  name: "Anil Kumar Tiwari",
  handle: "anil_kumar_tiwari",
  location: "Atlanta, GA",
  email: "aneelktiwari@gmail.com",
  phone: "+1 470 219 8395",
  phoneHref: "+14702198395",
  github: "https://github.com/xanyl",
  githubLabel: "github.com/xanyl",
  linkedin: "https://www.linkedin.com/in/anilktiwari/",
  linkedinLabel: "linkedin.com/in/anilktiwari",
  resume: "/Resume_Anil.pdf",
  roles: ["AI Engineer", "Data Engineer", "Researcher"],
};

export const summary =
  "Data Engineer with 2+ years of experience building scalable data architectures and production-grade ML solutions. Expert in high-performance data engineering pipelines, AI/ML development, and Large Language Model (LLM) integration. Proficient in streamlining processes through autonomous workflow automation with n8n.";

export interface ExperienceEntry {
  org: string;
  role: string;
  start: string;
  end: string;
  bullets: string[];
  stack: string[];
}

export const experience: ExperienceEntry[] = [
  {
    org: "Georgia State University",
    role: "Graduate Teaching Assistant",
    start: "Aug 2025",
    end: "Present",
    bullets: [
      "Served as a first point of contact for 50+ students, practicing active listening and providing resource referrals to ensure academic and personal well-being.",
      "Collaborated with faculty to modernize course curriculum by integrating real-world datasets, ensuring students gained practical experience with industry-standard tools.",
    ],
    stack: ["Python", "SQL", "Teaching"],
  },
  {
    org: "Merodream",
    role: "Data Engineer",
    start: "Sep 2023",
    end: "Aug 2025",
    bullets: [
      "Designed and implemented ETL scripts, CTEs, views, procedures, and Redshift tasks to automate the daily data processing orchestrated via Apache Airflow.",
      "Developed an AWS Redshift pipeline to run daily ETL scripts, monitored batch jobs, and resolved issues, ensuring continuous data processing without downtime.",
      "Optimized SQL queries and implemented table partitioning strategies, cutting cloud compute costs by 25% while handling terabytes of monthly transaction data.",
      "Collaborated with ML teams to deploy model training pipelines using Docker and Kubernetes, reducing setup time and improving scalability for model training.",
    ],
    stack: ["Apache Airflow", "AWS Redshift", "SQL", "Docker", "Kubernetes", "Python"],
  },
];

export interface Metric {
  value: string;
  label: string;
}

export interface ProjectEntry {
  name: string;
  blurb: string;
  /** Only set where a public repo actually exists. */
  repo?: string;
  bullets: string[];
  metrics: Metric[];
  stack: string[];
}

export const projects: ProjectEntry[] = [
  {
    name: "SAM2-LatentDiff",
    blurb: "Two-stage low-light image enhancement in latent space.",
    repo: "https://github.com/xanyl/SAM2-LatentDiff",
    bullets: [
      "Developed a two-stage low-light enhancement system combining frozen SAM2 hierarchical features with a pretrained Stable Diffusion v1.5 U-Net, using cross-attention and LoRA for parameter-efficient latent-space fine-tuning.",
      "Built an 87K-parameter PixelRefiner to reduce VAE reconstruction artifacts.",
      "Implemented preprocessing, training, evaluation, visualization, and ablation pipelines.",
    ],
    metrics: [
      { value: "18.61", label: "PSNR" },
      { value: "0.7085", label: "SSIM" },
      { value: "0.2399", label: "LPIPS" },
      { value: "111 ms", label: "Inference / A100" },
    ],
    stack: ["PyTorch", "SAM2", "Stable Diffusion", "LoRA", "CUDA"],
  },
  {
    name: "Hull Tactical Market Prediction",
    blurb: "GPU-accelerated ensemble for noisy financial time series.",
    bullets: [
      "Built a high-performance feature engineering pipeline using Polars and XGBoost (GPU-accelerated), dynamically selecting the top 30 signal features from complex volatility and sentiment interactions.",
      "Engineered a robust 6-model stacking ensemble (including CatBoost, LightGBM, and Random Forest) with a RidgeCV meta-learner, optimizing model stability for noisy financial data.",
      "Implemented a production-simulation inference server with volatility targeting logic, ensuring consistent model deployment and risk-adjusted scoring in a live-loop environment.",
    ],
    metrics: [
      { value: "30", label: "Signal Features" },
      { value: "6", label: "Model Ensemble" },
      { value: "GPU", label: "Accelerated" },
    ],
    stack: ["Polars", "XGBoost", "CatBoost", "LightGBM", "Scikit-learn"],
  },
  {
    name: "Wildlife Conservation Image Classification",
    blurb: "Species classifier for camera-trap imagery from Côte d'Ivoire.",
    bullets: [
      "Built an automated species classifier using ResNet50 with Transfer Learning to process camera-trap images from Côte d'Ivoire.",
      "Addressed severe class imbalance (90% empty frames) by implementing Focal Loss and oversampling minority classes.",
      "Developed a “motion-trigger” filtering script to automatically discard empty frames.",
    ],
    metrics: [
      { value: "+20%", label: "Recall, Rare Species" },
      { value: "−70%", label: "Manual Labeling" },
      { value: "90%", label: "Empty Frames" },
    ],
    stack: ["TensorFlow", "Keras", "ResNet50", "OpenCV", "NumPy"],
  },
];

export interface SkillGroup {
  label: string;
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    label: "Data Engineering",
    items: ["Apache Airflow", "AWS", "Azure", "Kafka", "Spark", "PostgreSQL"],
  },
  {
    label: "Machine Learning",
    items: ["TensorFlow", "PyTorch", "Scikit-learn", "YOLOv8", "OpenCV", "Keras", "Pandas", "NumPy"],
  },
  {
    label: "Cloud & DevOps",
    items: ["AWS (S3, EC2, Lambda, IAM)", "Docker", "Kubernetes", "CI/CD (GitHub Actions)", "Linux", "Terraform"],
  },
  {
    label: "Languages",
    items: ["Python", "SQL", "JavaScript", "React", "Next.js", "React Native"],
  },
  {
    label: "Concepts",
    items: ["ETL/ELT Pipelines", "Data Warehousing", "Object Detection", "REST APIs", "Agile", "n8n", "LangChain"],
  },
];

export interface EducationEntry {
  school: string;
  degree: string;
  detail: string;
}

export const education: EducationEntry[] = [
  {
    school: "Georgia State University",
    degree: "M.S. Computer Science",
    detail: "Expected Aug 2027",
  },
];

export interface CertificateRecord {
  title: string;
  issuer: string;
  issued: string;
  file?: string;
  credentialId?: string;
  verificationUrl?: string;
}

export const certificates: CertificateRecord[] = [
  {
    title: "AI Open Source Capstone Course",
    issuer: "CodePath — Honors",
    issued: "Jun 2026",
    file: codePathCertificate,
    credentialId: "421004",
  },
  {
    title: "Supervised Machine Learning: Regression and Classification",
    issuer: "Stanford University via Coursera",
    issued: "Apr 2024",
  },
  {
    title: "Python for Data Science, AI & Development",
    issuer: "IBM via Coursera",
    issued: "Oct 2023",
    file: pythonForDataScienceCertificate,
    credentialId: "MV9KT6C99L6S",
    verificationUrl: "https://coursera.org/verify/MV9KT6C99L6S",
  },
  {
    title: "Diploma in Quantum Computing and Programming (Bronze)",
    issuer: "Qiskit",
    issued: "Sep 2023",
  },
  {
    title: "AWS Academy Graduate — Cloud Foundations",
    issuer: "AWS Academy",
    issued: "Jul 2023",
  },
  {
    title: "Capstone: Retrieving, Processing, and Visualizing Data with Python",
    issuer: "University of Michigan via Coursera",
    issued: "Jun 2021",
    file: pythonCapstoneCertificate,
    credentialId: "MARZHTUTPSWZ",
    verificationUrl: "https://coursera.org/verify/MARZHTUTPSWZ",
  },
  {
    title: "Using Python to Access Web Data",
    issuer: "University of Michigan via Coursera",
    issued: "Oct 2020",
    file: webDataCertificate,
    credentialId: "J9388Q68FUM6",
    verificationUrl: "https://coursera.org/verify/J9388Q68FUM6",
  },
  {
    title: "Python Data Structures",
    issuer: "University of Michigan via Coursera",
    issued: "Sep 2020",
    file: pythonDataStructuresCertificate,
    credentialId: "3KZV65YFH466",
    verificationUrl: "https://coursera.org/verify/3KZV65YFH466",
  },
  {
    title: "Programming for Everybody (Getting Started with Python)",
    issuer: "University of Michigan via Coursera",
    issued: "Jul 2020",
    file: programmingForEverybodyCertificate,
    credentialId: "PFA6Q4P9R9YZ",
    verificationUrl: "https://coursera.org/verify/PFA6Q4P9R9YZ",
  },
];

export interface Publication {
  title: string;
  venue: string;
  url: string;
}

export const publications: Publication[] = [
  {
    title:
      "DAAL: Density-Aware Adaptive Line Margin Loss for Multi-Modal Deep Metric Learning",
    venue: "arXiv:2410.05438",
    url: "https://arxiv.org/abs/2410.05438",
  },
];

export interface SectionMeta {
  id: string;
  label: string;
}

export const sections: SectionMeta[] = [
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "github", label: "Open Source" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications" },
  { id: "publications", label: "Publications" },
  { id: "contact", label: "Contact" },
];
