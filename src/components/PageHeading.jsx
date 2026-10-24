
export default function PageHeading({
  eyebrow,
  title,
  highlight,
  description,
  centered = true,
}) {
  return (
    <div
      className={`w-full max-w-3xl ${
        centered ? "mx-auto text-center" : "text-left"
      }`}
    >
      {eyebrow && (
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600 sm:text-sm">
          {eyebrow}
        </p>
      )}

      <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
        {title}{" "}
        {highlight && (
          <span className="text-violet-600">{highlight}</span>
        )}
      </h1>

      {description && (
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
          {description}
        </p>
      )}
    </div>
  );
}
