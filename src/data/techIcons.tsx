import type { IconType } from "react-icons";
import {
  FiActivity,
  FiCode,
  FiDatabase,
  FiEye,
  FiGitBranch,
  FiLayers,
  FiLink,
  FiRefreshCw,
  FiServer,
  FiZap,
} from "react-icons/fi";
import {
  SiAmazonaws,
  SiApacheairflow,
  SiApachekafka,
  SiApachespark,
  SiDocker,
  SiGithubactions,
  SiJavascript,
  SiKeras,
  SiKubernetes,
  SiLinux,
  SiMicrosoftazure,
  SiNextdotjs,
  SiNumpy,
  SiOpencv,
  SiPandas,
  SiPostgresql,
  SiPytorch,
  SiPython,
  SiReact,
  SiScikitlearn,
  SiTensorflow,
  SiTerraform,
  SiYolo,
} from "react-icons/si";

export interface TechIcon {
  Icon: IconType;
  /** Official brand hex. Omitted for brands whose mark is black or
   *  white — those inherit the text color so they survive both themes. */
  color?: string;
}

const registry: Record<string, TechIcon> = {
  // Data engineering
  "Apache Airflow": { Icon: SiApacheairflow, color: "#017CEE" },
  AWS: { Icon: SiAmazonaws, color: "#FF9900" },
  "AWS (S3, EC2, Lambda, IAM)": { Icon: SiAmazonaws, color: "#FF9900" },
  "AWS Redshift": { Icon: SiAmazonaws, color: "#FF9900" },
  Azure: { Icon: SiMicrosoftazure, color: "#0078D4" },
  Kafka: { Icon: SiApachekafka },
  Spark: { Icon: SiApachespark, color: "#E25A1C" },
  PostgreSQL: { Icon: SiPostgresql, color: "#4169E1" },

  // Machine learning
  TensorFlow: { Icon: SiTensorflow, color: "#FF6F00" },
  PyTorch: { Icon: SiPytorch, color: "#EE4C2C" },
  "Scikit-learn": { Icon: SiScikitlearn, color: "#F7931E" },
  YOLOv8: { Icon: SiYolo },
  OpenCV: { Icon: SiOpencv, color: "#5C3EE8" },
  Keras: { Icon: SiKeras, color: "#D00000" },
  Pandas: { Icon: SiPandas },
  NumPy: { Icon: SiNumpy, color: "#4DABCF" },
  SAM2: { Icon: SiPytorch, color: "#EE4C2C" },
  "Stable Diffusion": { Icon: FiLayers, color: "#A78BFA" },
  LoRA: { Icon: FiLayers, color: "#A78BFA" },
  ResNet50: { Icon: FiLayers, color: "#A78BFA" },
  Polars: { Icon: FiDatabase, color: "#0F8CFF" },
  XGBoost: { Icon: FiActivity, color: "#3FA037" },
  CatBoost: { Icon: FiActivity, color: "#FFCC00" },
  LightGBM: { Icon: FiActivity, color: "#9FD356" },
  CUDA: { Icon: FiZap, color: "#76B900" },

  // Cloud & DevOps
  Docker: { Icon: SiDocker, color: "#2496ED" },
  Kubernetes: { Icon: SiKubernetes, color: "#326CE5" },
  "CI/CD (GitHub Actions)": { Icon: SiGithubactions, color: "#2088FF" },
  Linux: { Icon: SiLinux, color: "#FCC624" },
  Terraform: { Icon: SiTerraform, color: "#7B42BC" },

  // Languages
  Python: { Icon: SiPython, color: "#3776AB" },
  SQL: { Icon: FiDatabase, color: "#38BDF8" },
  JavaScript: { Icon: SiJavascript, color: "#F7DF1E" },
  React: { Icon: SiReact, color: "#61DAFB" },
  "React Native": { Icon: SiReact, color: "#61DAFB" },
  "Next.js": { Icon: SiNextdotjs },

  // Concepts — no brand marks, so neutral glyphs that inherit the text color
  "ETL/ELT Pipelines": { Icon: FiGitBranch },
  "Data Warehousing": { Icon: FiServer },
  "Object Detection": { Icon: FiEye },
  "REST APIs": { Icon: FiCode },
  Agile: { Icon: FiRefreshCw },
  n8n: { Icon: FiZap, color: "#EA4B71" },
  LangChain: { Icon: FiLink },
  Teaching: { Icon: FiLayers },
};

export function techIcon(name: string): TechIcon | undefined {
  return registry[name];
}
