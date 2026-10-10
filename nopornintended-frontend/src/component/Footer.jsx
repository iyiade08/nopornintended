import { Link } from "react-router-dom";

const links = [
  { label: "Images", path: "/" },
  { label: "Animated Gifs", path: "/" },
  { label: "Stories", path: "/" },
];

const legalLinks = [
  { label: "Terms", path: "/terms" },
  { label: "Privacy", path: "/privacy" },
  { label: "DMCA / Report Content", path: "/report" },
  { label: "Contact", path: "/contact" },
];

const Footer = () => {
  return (
    <footer className="mt-10 md:mt-16 w-full border-t border-white/10 bg-[#130F1E]">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-10 text-center md:py-14">
        {/* category links */}
        <h2 className="flex flex-wrap items-center justify-center gap-x-3 font-poppins text-xl font-semibold capitalize text-white md:text-3xl">
          {links.map((item, index) => (
            <span key={item.label} className="flex items-center gap-3">
              <Link
                to={item.path}
                className="transition-colors hover:text-[#FD3E81]"
              >
                {item.label}
              </Link>
              {index < links.length - 1 && (
                <span className="text-white/30">/</span>
              )}
            </span>
          ))}
        </h2>

        {/* intro */}
        <p className="max-w-xl font-poppins text-sm leading-relaxed text-slate-400 md:text-base">
          We hope you enjoyed our free movies and pics!{" "}
          <span className="bg-gradient-to-br from-[#FD3E81] to-[#895CF5] bg-clip-text font-medium text-transparent">
            Think about bookmarking our site!
          </span>{" "}
          If you are not an adult or are offended by adult content, please don't
          come back.
        </p>

        {/* contact */}
        <p className="font-poppins text-base text-slate-300">
          Have something to say?{" "}
          <Link
            to="/forum"
            className="font-semibold text-white underline-offset-4 transition-colors hover:text-[#FD3E81] hover:underline"
          >
            Use our forum
          </Link>{" "}
          or{" "}
          <Link
            to="/contact"
            className="font-semibold text-white underline-offset-4 transition-colors hover:text-[#FD3E81] hover:underline"
          >
            contact us directly
          </Link>
        </p>

        {/* disclaimer */}
        <div className="w-full max-w-xl rounded-xl border border-white/10 bg-white/5 p-4 text-left">
          <p className="mb-1 font-poppins text-xs font-semibold uppercase tracking-wider text-[#CB4CB5]">
            Disclaimer notice
          </p>
          <p className="font-poppins text-xs leading-relaxed text-slate-400 md:text-sm">
            We do not claim ownership of any content on this site. To report
            content or request removal, please use our{" "}
            <Link
              to="/report"
              className="text-slate-300 underline underline-offset-2 transition-colors hover:text-[#FD3E81]"
            >
              DMCA / Report Content
            </Link>{" "}
            page.
          </p>
        </div>

        {/* legal links */}
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-poppins text-sm text-slate-400">
          {legalLinks.map((item) => (
            <li key={item.label}>
              <Link
                to={item.path}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* copyright */}
        <p className="border-t border-white/10 pt-6 font-poppins text-xs text-slate-500 w-full">
          © {new Date().getFullYear()} nopornintended. All rights reserved. 18+
          only.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
