import clsx from "clsx";
import useTheme from "../../globalState/theme";
import { ThemeState } from "./NavBar";


export default function Footer() {
  const theme = useTheme((state) => (state as ThemeState).theme);
  const footerClasses = clsx(
    "w-full text-center fixed bottom-0 text-sm py-3 ",
    {
      "bg-white py-3 border-t border-gray-100": theme === "light",
      "bg-[#1A1B1E] border-gray-800": theme === "dark",
    }
  );
  return (
  
<footer className={footerClasses}>
        <p>&copy; {new Date().getFullYear()} Made with &#128157; by <span>AnilKTiwari</span></p>
      </footer>

    
  )
}
