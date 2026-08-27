import { projectCategories } from "./projectCategories";


export interface Project {
  name: string;
  category: (typeof projectCategories)[number];
  desc: string;
  tech: string[];
  link: {
    demo: string | null;
    repo: string | null;
  };
}
