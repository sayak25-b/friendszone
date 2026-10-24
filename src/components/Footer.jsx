
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { GOOGLE_FORM_URL } from "../data/websiteData";

export default function Footer() {
  return (
    <footer className="mt-20 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-3 lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold">
            <Heart className="text-pink-400" fill="currentColor" />
            FriendsZone
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
            A little corner of the internet for friendship, shared memories
            and moments that deserve to last forever.
          </p>
        </div>

        <div>
          <h3 className="font-bold">Explore</h3>
          <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-400">
            <Link className="hover:text-white" to="/">Home</Link>
            <Link className="hover:text-white" to="/memories">Memories</Link>
            <Link className="hover:text-white" to="/events">Events</Link>
            <Link className="hover:text-white" to="/members">Members</Link>
            <Link className="hover:text-white" to="/admin">Admin</Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold">Become a part of us</h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Want to join our friendship community? Submit your details through
            our registration form.
          </p>
          <a
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-full bg-pink-500 px-5 py-3 text-sm font-bold text-white hover:bg-pink-400"
          >
            Register Now
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} FriendsZone. Made with ♥ for friendship.
      </div>
    </footer>
  );
}
