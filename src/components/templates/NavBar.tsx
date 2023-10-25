import clsx from "clsx";
import { Link, useLocation } from "react-router-dom";
import { Switch, Group, Burger, Drawer } from "@mantine/core";
import { useEffect, useState } from "react";
import { IoSunny } from "react-icons/io5";
import { useDisclosure } from "@mantine/hooks";
import useTheme from "../../globalState/theme";
import { IoIosMoon } from "react-icons/io";

type Mode = "light" | "dark";

export interface ThemeState {
  theme: Mode;
  setDarkMode: () => void;
  setLightMode: () => void;
}

export default function Navbar() {
  const theme = useTheme((state) => (state as ThemeState).theme);
  const setDarkMode = useTheme((state) => (state as ThemeState).setDarkMode);
  const setLightMode = useTheme((state) => (state as ThemeState).setLightMode);
  const [mode, setMode] = useState<Mode>(theme);

  const toggleColorScheme = () => {
    mode === "light" ? setMode("dark") : setMode("light");
    mode === "light" ? setDarkMode() : setLightMode();
  };

  useEffect(() => {
    document.documentElement.setAttribute("class", theme);
  }, [theme]);

  const navbarClasses = clsx(
    "px-5 border-b border-gray-200 sticky top-0 z-50",
    {
      "bg-white": theme === "light",
      "bg-[#1A1B1E] border-gray-800": theme === "dark",
    }
  );

  return (
    <nav
      id="navbar"
      className= {navbarClasses}>
    
      <div className="flex items-center justify-between w-full max-w-4xl m-auto">
        <Navlinks position="top" />
        <BurgerButton />
        <Group>
          <Switch
            color="gray"
            checked={mode === "dark"}
            onChange={toggleColorScheme}
            size="md"
            onLabel={<IoSunny className="text-yellow-300 w-4 h-4" />}
            offLabel={<IoIosMoon className="text-blue-600 w-4 h-4" />}
          />
        </Group>
      </div>
    </nav>
  );
}

function Navlinks({ position }: { position: "top" | "side" }): JSX.Element {
  const location = useLocation();
  return (
    <div
      className={clsx(
        position === "top" && "sm:flex h-16 items-center hidden",
        position === "side" &&
          "flex flex-col items-center gap-5 sm:hidden text-center"
      )}
    >
      <Link
        to="/"
        className={clsx(def, location.pathname === "/" ? active : nonactive)}
      >
        Home
      </Link>
      <Link
        to="/about"
        className={clsx(
          def,
          location.pathname === "/about" ? active : nonactive
        )}
      >
        About
      </Link>
      <Link
        to="/skills"
        className={clsx(
          def,
          location.pathname === "/skills" ? active : nonactive
        )}
      >
        Skills
      </Link>
      <Link
        to="/projects"
        className={clsx(
          def,
          location.pathname === "/projects" ? active : nonactive
        )}
      >
        Projects
      </Link>
      <Link
        to="/contact"
        className={clsx(
          def,
          location.pathname === "/contact" ? active : nonactive
        )}
      >
        Contact
      </Link>
    </div>
  );
}

function BurgerButton() {
  const [opened, { toggle }] = useDisclosure(false);
  return (
    <>
      <Burger className="sm:hidden h-16" opened={opened} onClick={toggle} />
      <Drawer
        opened={opened}
        onClose={toggle}
        onClick={toggle}
        overlayProps={{ opacity: 0.5, blur: 4 }}
      >
        <Navlinks position="side" />
      </Drawer>
    </>
  );
}

const active =
  "text-blue-600 hover:bg-blue-100/50 dark:text-blue-400 dark:hover:bg-blue-100/10";
const nonactive =
  "hover:bg-gray-200/50 dark:text-gray-200 dark:hover:bg-gray-200/10";
const def =
  "py-2 px-4 rounded-md font-semibold text-xl sm:text-[17px] active:scale-90 w-full";
