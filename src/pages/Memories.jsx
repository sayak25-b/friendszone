import {
  ArrowDown,
  CalendarDays,
  FolderOpen,
  Heart,
  Images,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import PageContainer from "../components/PageContainer";
import PageHeading from "../components/PageHeading";
import useApiData from "../hooks/useApiData";
import { apiAssetUrl } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";

export default function Memories() {
  const { data: memories, loading, error } = useApiData("/memories");
  const allMemories = [...memories].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const featuredMemory =
    allMemories.find((memory) => memory.featured) || allMemories[0];
  const moreMemories = featuredMemory
    ? allMemories.filter((memory) => memory._id !== featuredMemory._id)
    : [];

  return (
    <main className="min-h-screen overflow-hidden bg-[#faf8ff]">
      <section className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-br from-violet-50 via-white to-pink-50">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" />

        <PageContainer className="relative py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
                <Sparkles size={16} />
                Our friendship scrapbook
              </div>

              <PageHeading
                centered={false}
                eyebrow="Little moments, lasting stories"
                title="Memories that"
                highlight="matter."
                description="Every picture holds a story. Revisit the gatherings, happy accidents, and everyday moments that make our friendship special."
              />

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#memory-gallery"
                  className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
                >
                  Browse the scrapbook
                  <ArrowDown size={18} />
                </a>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Images size={17} className="text-pink-500" />
                  {loading
                    ? "Loading memories…"
                    : error
                      ? "Memories are unavailable"
                      : `${allMemories.length} ${allMemories.length === 1 ? "memory" : "memories"} and counting`}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-violet-100 bg-white/80 p-8 text-center shadow-sm sm:min-h-[390px]">
                <p className="font-semibold text-slate-500">Loading the scrapbook…</p>
              </div>
            ) : error ? (
              <div role="alert" className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center text-red-700 sm:min-h-[390px]">
                {error}
              </div>
            ) : featuredMemory ? (
              <article className="group relative overflow-hidden rounded-[2rem] border-[6px] border-white bg-white shadow-[0_28px_80px_-35px_rgba(76,29,149,0.45)]">
                <div className="relative h-[300px] overflow-hidden sm:h-[390px] lg:h-[440px]">
                  <img
                    src={apiAssetUrl(featuredMemory.imageUrl)}
                    alt={featuredMemory.title}
                    className="h-full w-full object-contain transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent" />
                  <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-violet-800 backdrop-blur">
                    <Heart size={14} className="text-pink-500" fill="currentColor" />
                    Latest memory
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <p className="flex items-center gap-2 text-sm font-bold text-pink-100">
                      <CalendarDays size={16} />
                      {formatMonthYear(featuredMemory.date)}
                    </p>
                    <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                      {featuredMemory.title}
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-white/85 sm:text-base">
                      {featuredMemory.description}
                    </p>
                    {(featuredMemory.location || featuredMemory.album) && (
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-white/80">
                        {featuredMemory.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} />
                            {featuredMemory.location}
                          </span>
                        )}
                        {featuredMemory.album && (
                          <span className="inline-flex items-center gap-1.5">
                            <FolderOpen size={14} />
                            {featuredMemory.album}
                          </span>
                        )}
                      </p>
                    )}
                    {featuredMemory.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {featuredMemory.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
                          >
                            <Tag size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-violet-100 bg-white/80 p-8 text-center shadow-sm sm:min-h-[390px]">
                <div>
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Images size={30} />
                  </span>
                  <p className="mt-5 font-bold text-slate-800">
                    Your scrapbook is ready
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Shared memories will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </PageContainer>
      </section>

      <section id="memory-gallery" className="scroll-mt-24 py-14 sm:py-20">
        <PageContainer>
          <div className="mb-8 flex flex-col gap-4 border-b border-violet-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600 sm:text-sm">
                Flip through the pages
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                More moments, <span className="text-violet-600">more stories.</span>
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-500">
                The laughs, the little adventures, and the moments we always
                find ourselves talking about.
              </p>
            </div>
            {featuredMemory && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
                <Images size={16} />
                {moreMemories.length}{" "}
                {moreMemories.length === 1 ? "more memory" : "more memories"}
              </span>
            )}
          </div>

          {loading ? (
            <p className="rounded-3xl border border-violet-100 bg-white p-8 text-center text-slate-500">
              Loading memories…
            </p>
          ) : error ? (
            <p role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
              {error}
            </p>
          ) : moreMemories.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {moreMemories.map((memory, index) => (
                <article
                  key={memory._id}
                  className={`group overflow-hidden rounded-[1.75rem] border border-violet-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_55px_-30px_rgba(124,58,237,0.4)] ${
                    index === 0 ? "lg:col-span-2" : ""
                  }`}
                >
                  <div
                    className={`relative overflow-hidden bg-violet-100 ${
                      index === 0 ? "h-72 sm:h-80" : "h-60"
                    }`}
                  >
                    <img
                      src={apiAssetUrl(memory.imageUrl)}
                      alt={memory.title}
                      loading="lazy"
                      className="h-full w-full object-contain transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" />
                    <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-xs font-bold text-violet-800 backdrop-blur">
                      <CalendarDays size={14} className="text-pink-500" />
                      {formatMonthYear(memory.date)}
                    </span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                      {memory.title}
                    </h3>
                    <p className="mt-2 leading-7 text-slate-500">
                      {memory.description}
                    </p>
                    {(memory.location || memory.album) && (
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                        {memory.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} className="text-pink-500" />
                            {memory.location}
                          </span>
                        )}
                        {memory.album && (
                          <span className="inline-flex items-center gap-1.5">
                            <FolderOpen size={14} className="text-violet-600" />
                            {memory.album}
                          </span>
                        )}
                      </p>
                    )}
                    {memory.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {memory.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-violet-200 bg-white px-6 py-14 text-center">
              <Heart className="mx-auto text-pink-400" size={30} />
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                {featuredMemory
                  ? "That’s the whole scrapbook for now."
                  : "The first page is waiting."}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {featuredMemory
                  ? "Check back soon for more moments from our circle."
                  : "Come back when we have a few memories to share."}
              </p>
            </div>
          )}
        </PageContainer>
      </section>
    </main>
  );
}
