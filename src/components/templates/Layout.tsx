import { useLocation } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./NavBar";
import FormatCapitalize from "../../utils/FormatCapitalize";
import { Helmet } from "react-helmet";


export default function Layout({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const format = FormatCapitalize(location.pathname.replace("/", ""));
  const title = format
    ? format + " | Anil K Tiwari"
    : "Anil K Tiwari | Full Stack Developer";
  return (
    <main className="">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <Navbar />
      <section className="max-w-4xl m-auto px-5 ">{children}</section>
      <Footer />
    </main>
  );
}
