
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Heart } from "lucide-react";

const links = [
  { name: "Home", path: "/" },
  { name: "Memory Lane", path: "/memories" },
  { name: "Events", path: "/events" },
  { name: "Members", path: "/members" },
  { name: "My Profile", path: "/my-profile" },
  { name: "Play Zone", path: "/play-zone" },
  { name: "Birthday Calendar", path: "/birthday-calendar" },
  { name: "Awards", path: "/awards" }
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition ${
      isActive
        ? "text-violet-700"
        : "text-slate-600 hover:text-violet-700"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-amber-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 shadow-md">
        <div className="diwali-fireworks pointer-events-none absolute inset-0 overflow-hidden">
  {/* Rockets */}
  <span className="rocket rocket-one">🚀</span>
  <span className="rocket rocket-two">🚀</span>

  {/* Crackers and sparkles */}
  <span className="cracker cracker-one">🎆</span>
  <span className="cracker cracker-two">🎇</span>
  <span className="cracker cracker-three">✨</span>

  {/* Tubri */}
  <span className="tubri tubri-one">🎇</span>
  <span className="tubri tubri-two">✨</span>

  {/* Diya
  <span className="diya">🪔</span> */}
</div>
      
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 text-white">
            <Heart size={22} fill="currentColor" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Friends<span className="text-violet-600">Zone</span>
          </span>
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={linkClass}
            >
              {link.name}
            </NavLink>
          ))}

          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdwhTzwyq6_5R1Cd5PeSGq0JOvvScwUCDVuCOAUpCTxBbJPUQ/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Join FriendsZone
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="rounded-xl p-2 text-slate-700 hover:bg-violet-50 lg:hidden"
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-violet-100 bg-white px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={linkClass}
              >
                {link.name}
              </NavLink>
            ))}

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdwhTzwyq6_5R1Cd5PeSGq0JOvvScwUCDVuCOAUpCTxBbJPUQ/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-5 py-3 text-center font-bold text-white"
            >
              Register Now
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
