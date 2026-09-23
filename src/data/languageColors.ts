/** GitHub Linguist colors for the languages this profile actually uses. */
const colors: Record<string, string> = {
  Python: "#3572A5",
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  "Jupyter Notebook": "#DA5B0B",
  HTML: "#E34C26",
  CSS: "#563D7C",
  Dart: "#00B4AB",
  Java: "#B07219",
  TeX: "#3D6117",
  Shell: "#89E051",
  C: "#555555",
  "C++": "#F34B7D",
  Go: "#00ADD8",
  Rust: "#DEA584",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

export default function languageColor(lang: string | null) {
  return (lang && colors[lang]) || "#8A9199";
}
