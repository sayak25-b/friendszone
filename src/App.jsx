
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Memories from "./pages/Memories";
import Events from "./pages/Events";
import Members from "./pages/Members";
import Admin from "./pages/Admin";

function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <h1 className="text-5xl font-black text-violet-600">404</h1>
      <p className="mt-4 text-lg text-slate-600">
        Oops! This page isn't part of our scrapbook.
      </p>
      <a
        href="/"
        className="mt-6 rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700"
      >
        Back to Home
      </a>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <Navbar />

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/events" element={<Events />} />
            <Route path="/members" element={<Members />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
