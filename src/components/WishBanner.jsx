import { Sparkles, X } from "lucide-react";
import { apiAssetUrl } from "../lib/api";

const themeDetails = {
  celebration: { label: "A little celebration", decoration: "✦" },
  elegant: { label: "With warm wishes", decoration: "✧" },
  playful: { label: "Let’s make it magical", decoration: "✷" },
  festive: { label: "Season’s greetings", decoration: "❋" },
};

export default function WishBanner({ wish, onClose, preview = false }) {
  const imageUrl = wish.imageUrl ? apiAssetUrl(wish.imageUrl) : "";

  return (
    <section
      className={`wish-banner wish-theme-${wish.theme || "celebration"} relative isolate overflow-hidden text-white`}
      style={{
        "--wish-background": wish.backgroundColor || "#6d28d9",
        "--wish-accent": wish.accentColor || "#ec4899",
        backgroundColor: wish.backgroundColor || "#6d28d9",
        backgroundImage: imageUrl
          ? `url("${imageUrl}")`
          : undefined,
      }}
      aria-label={`${wish.title}: ${wish.message}`}
    >
      <div className="wish-banner-sparkle wish-banner-sparkle-one" aria-hidden="true">✦</div>
      <div className="wish-banner-sparkle wish-banner-sparkle-two" aria-hidden="true">✧</div>
      <div className="wish-banner-sparkle wish-banner-sparkle-three" aria-hidden="true">✷</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={preview ? "Close greeting preview" : "Dismiss greeting"}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white transition hover:bg-white/20 sm:right-6 sm:top-6"
        >
          <X size={20} />
        </button>
      )}
      <div className="relative z-10 mx-auto flex min-h-48 max-w-7xl items-center justify-center px-6 py-10 text-center sm:min-h-56 sm:px-12 sm:py-12">
        <div className="max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
            <Sparkles size={15} style={{ color: "var(--wish-accent)" }} />
            {themeDetails[wish.theme]?.label || themeDetails.celebration.label}
          </p>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            <span className="mr-3" style={{ color: "var(--wish-accent)" }} aria-hidden="true">
              {themeDetails[wish.theme]?.decoration || "✦"}
            </span>
            {wish.title}
            <span className="ml-3" style={{ color: "var(--wish-accent)" }} aria-hidden="true">
              {themeDetails[wish.theme]?.decoration || "✦"}
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-3xl whitespace-pre-line text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
            {wish.message}
          </p>
        </div>
      </div>
    </section>
  );
}
