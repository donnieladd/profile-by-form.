import { useEffect, useRef } from "react";

export type MediaReviewVideo = {
  title: string | null;
  url: string;
};

type MediaReviewPresentationProps = {
  candidateName: string;
  title?: string | null;
  subtitle?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  videos: MediaReviewVideo[];
};

function normalizeYouTube(url: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return "";
  }
  return "";
}

function isLikelyYouTube(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.includes("youtube") || u.hostname.includes("youtu.be");
  } catch {
    return false;
  }
}

export function MediaReviewPresentation({
  candidateName,
  title,
  subtitle,
  city,
  avatarUrl,
  videos,
}: MediaReviewPresentationProps) {
  const normalizedVideos = videos
    .map((v) => {
      const source = v.url.trim();
      const embed = isLikelyYouTube(source) ? normalizeYouTube(source) : "";
      return {
        title: v.title?.trim() || "Video",
        source,
        embed,
      };
    })
    .filter((v) => v.source.length > 0)
    .slice(0, 12);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const videoNodes = videoRefs.current;

    const pauseAll = (except?: HTMLVideoElement) => {
      videoNodes.forEach((node) => {
        if (!node || node === except) return;
        if (!node.paused) {
          node.pause();
        }
      });
    };

    const onPlay = (target: HTMLVideoElement) => {
      pauseAll(target);
      target.closest("article")?.classList.add("media-review-play-state");
    };

    const onPause = (target: HTMLVideoElement) => {
      target.closest("article")?.classList.remove("media-review-play-state");
    };

    const cleanup: Array<() => void> = [];

    videoNodes.forEach((node) => {
      if (!node) return;
      const playHandler = () => onPlay(node);
      const pauseHandler = () => onPause(node);
      node.addEventListener("play", playHandler);
      node.addEventListener("pause", pauseHandler);
      node.addEventListener("ended", pauseHandler);
      cleanup.push(() => {
        node.removeEventListener("play", playHandler);
        node.removeEventListener("pause", pauseHandler);
        node.removeEventListener("ended", pauseHandler);
      });
    });

    const cards = Array.from(
      sectionRef.current?.querySelectorAll<HTMLElement>("[data-reveal-card]") ?? [],
    );

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const card = entry.target as HTMLElement;
          card.classList.remove("translate-y-3", "opacity-0");
          card.classList.add("translate-y-0", "opacity-100");
          io.unobserve(card);
        }
      },
      { threshold: 0.2 },
    );

    cards.forEach((card, index) => {
      card.style.setProperty("transition-delay", `${Math.min(index * 90, 420)}ms`);
      io.observe(card);
    });

    return () => {
      io.disconnect();
      cleanup.forEach((fn) => fn());
    };
  }, [normalizedVideos]);

  return (
    <article
      ref={sectionRef}
      className="min-h-screen bg-[#0a0a0c] text-white"
      style={{
        background:
          "radial-gradient(900px 420px at 88% -8%, color-mix(in oklab, var(--gold) 17%, transparent), transparent 58%), radial-gradient(700px 420px at -15% 100%, color-mix(in oklab, var(--gold-deep) 16%, transparent), transparent 65%), #0b0b0d",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="border-b border-white/15 pb-6">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/55">
            <span className="font-medium">ONE39 · Profile by form.</span>
            <span>Candidate Media Review</span>
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/55">
              {subtitle ?? "Private Candidate File"}
            </p>
            <h1 className="font-serif text-[clamp(2.8rem,9vw,5.5rem)] leading-[0.98] tracking-[-0.03em] text-white">
              {title || candidateName}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              {city ?? "Candidate Media Review"}
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-white/75">
              Prepared for internal review
            </div>
          </div>

          <aside className="relative mx-auto flex w-full max-w-sm justify-center lg:max-w-none lg:justify-end">
            <div className="h-72 w-full max-w-xs overflow-hidden rounded-[24px] border border-white/20 bg-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${candidateName} portrait`}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-black/30">
                  <span className="font-serif text-6xl text-white/55">
                    {candidateName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="mt-12 border-t border-white/15 py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                Video file review
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-tight text-white sm:text-5xl">
                Videos
              </h2>
            </div>
            <p className="text-sm text-white/55">{normalizedVideos.length} videos</p>
          </div>

          {normalizedVideos.length === 0 ? (
            <div className="rounded-2xl border border-white/20 bg-white/5 p-6 text-white/70">
              No video assets were found in this profile yet.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {normalizedVideos.map((video, index) => (
                <article
                  key={`${video.source}-${index}`}
                  data-reveal-card
                  className="media-review-play-card relative min-h-[265px] overflow-hidden rounded-3xl border border-white/20 bg-[#111115] p-4 opacity-0 transition duration-700 will-change-transform will-change-opacity translate-y-3"
                >
                  <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/50">
                    <span className="font-medium">{video.title}</span>
                    <span>
                      {String(index + 1).padStart(2, "0")} / {" "}
                      {String(normalizedVideos.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative">
                    {video.embed ? (
                      <iframe
                        title={video.title}
                        src={video.embed}
                        className="h-56 w-full rounded-2xl border border-white/10"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="relative">
                        <video
                          ref={(el) => {
                            videoRefs.current[index] = el;
                          }}
                          controls
                          playsInline
                          preload="metadata"
                          controlsList="nodownload"
                          className="h-56 w-full rounded-2xl bg-black object-cover"
                        >
                          <source src={video.source} type="video/mp4" />
                        </video>
                        <button
                          type="button"
                          aria-label={`Play ${video.title}`}
                          className="absolute inset-0 grid place-items-center rounded-2xl bg-black/0 transition hover:bg-black/20"
                          onClick={(event) => {
                            const videoNode =
                              event.currentTarget.parentElement?.querySelector("video") as
                                | HTMLVideoElement
                                | null;
                            if (!videoNode) return;
                            if (videoNode.paused) {
                              void videoNode.play();
                            } else {
                              videoNode.pause();
                            }
                          }}
                        >
                          <span className="rounded-full border border-white/40 bg-white/15 p-3 text-white transition hover:bg-white/25">
                            ▶
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-white/15 py-8 text-center text-[11px] uppercase tracking-[0.2em] text-white/40">
          Candidate Media Review · Confidential Materials
        </footer>
      </div>
    </article>
  );
}
