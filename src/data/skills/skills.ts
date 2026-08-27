import { Skill } from "./skill";

export const skills: Skill[] = [
  { name: "Python", category: "Languages", icon: "python.svg" },
  { name: "SQL", category: "Languages", icon: "mysql.svg" },
  { name: "JavaScript", category: "Languages", icon: "js.svg" },

  { name: "Apache Airflow", category: "Data Engineering" },
  { name: "Apache Kafka", category: "Data Engineering" },
  { name: "Apache Spark", category: "Data Engineering" },
  { name: "PostgreSQL", category: "Data Engineering" },
  { name: "ETL / ELT Pipelines", category: "Data Engineering" },
  { name: "Data Warehousing", category: "Data Engineering" },

  { name: "TensorFlow", category: "Machine Learning" },
  { name: "PyTorch", category: "Machine Learning" },
  { name: "Scikit-learn", category: "Machine Learning" },
  { name: "YOLOv8", category: "Machine Learning" },
  { name: "OpenCV", category: "Machine Learning" },
  { name: "Keras", category: "Machine Learning" },
  { name: "Pandas", category: "Machine Learning" },
  { name: "NumPy", category: "Machine Learning" },

  { name: "AWS", category: "Cloud & DevOps" },
  { name: "Azure", category: "Cloud & DevOps" },
  { name: "Docker", category: "Cloud & DevOps" },
  { name: "Kubernetes", category: "Cloud & DevOps" },
  { name: "Terraform", category: "Cloud & DevOps" },
  { name: "GitHub Actions", category: "Cloud & DevOps", icon: "ci.svg" },
  { name: "Linux", category: "Cloud & DevOps" },

  { name: "React", category: "Automation", icon: "react.svg" },
  { name: "Next.js", category: "Automation", icon: "next.svg" },
  { name: "React Native", category: "Automation", icon: "react.svg" },
  { name: "n8n", category: "Automation" },
  { name: "LangChain", category: "Automation" },
  { name: "REST APIs", category: "Automation", icon: "postman.svg" },

  // Kept for technology badges on legacy project cards, but hidden from the
  // resume-aligned Skills page.
  { name: "HTML", category: "Languages", icon: "html.svg", show: false },
  { name: "CSS", category: "Languages", icon: "css.svg", show: false },
  { name: "TypeScript", category: "Languages", icon: "ts.svg", show: false },
  { name: "Dart", category: "Languages", icon: "dart.svg", show: false },
  { name: "java", category: "Languages", icon: "java.svg", show: false },
  { name: "Redux", category: "Automation", icon: "redux.png", show: false },
  { name: "Nextjs", category: "Automation", icon: "next.svg", show: false },
  { name: "Nodejs", category: "Automation", icon: "node.svg", show: false },
  { name: "Expressjs", category: "Automation", icon: "express.svg", show: false },
  { name: "Flutter", category: "Automation", icon: "flutter.svg", show: false },
  { name: "Bootstrap", category: "Automation", icon: "bootstrap.svg", show: false },
  { name: "Tailwind CSS", category: "Automation", icon: "tailwind.svg", show: false },
  { name: "Mantine", category: "Automation", icon: "mantine.svg", show: false },
  { name: "Mysql", category: "Data Engineering", icon: "mysql.svg", show: false },
  { name: "Firestore", category: "Data Engineering", icon: "firestore.svg", show: false },
];
