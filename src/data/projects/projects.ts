import { Project } from "./project";

export const projects: Project[] = [
  {
    name: "SAM2-LatentDiff",
    category: "Machine Learning",
    desc: "A SAM2-guided low-light image enhancement system using Stable Diffusion v1.5, cross-attention, LoRA, and an 87K-parameter PixelRefiner. It achieved 18.61 PSNR, 0.7085 SSIM, 0.2399 LPIPS, and 111 ms inference on an NVIDIA A100.",
    link: {
      demo: null,
      repo: null,
    },
    tech: ["Python", "PyTorch", "SAM2", "Stable Diffusion", "LoRA"],
  },
  {
    name: "Wildlife Conservation Image Classification",
    category: "Machine Learning",
    desc: "A ResNet50 camera-trap species classifier that addresses severe class imbalance with Focal Loss and oversampling, improving rare-species recall by 20% and reducing manual labeling effort by 70%.",
    link: {
      demo: null,
      repo: null,
    },
    tech: ["Python", "ResNet50", "Transfer Learning", "Computer Vision"],
  },
  {
    name: "Hull Tactical Market Prediction",
    category: "Data Engineering",
    desc: "A high-performance feature pipeline and six-model stacking ensemble for noisy financial data, with GPU-accelerated feature selection and production-simulation inference using volatility targeting.",
    link: {
      demo: null,
      repo: null,
    },
    tech: ["Polars", "XGBoost", "CatBoost", "LightGBM", "RidgeCV"],
  },
];
