import { useState, useRef, useEffect, useCallback } from "react";

/*
  DemoVideo — small inline video with an "Expand" button that opens a large view.

  Files it expects (put both in your Vite `public/demo/` folder):
    public/demo/coprompt-demo.mp4
    public/demo/coprompt-demo-poster.jpg

  Usage (anywhere on the landing page):
    import DemoVideo from "./DemoVideo";
    ...
    <DemoVideo />

  The menu item should link to  /#demo-section  (the id of the section below).
*/

const CSS = `
.cp-demo{padding:24px 20px;text-align:center;scroll-margin-top:90px}
.cp-demo__title{margin:0 0 10px;font-size:clamp(26px,4vw,38px);font-weight:700;line-height:1.15}
.cp-demo__sub{margin:0 auto 32px;max-width:620px;font-size:17px;line-height:1.55;opacity:.75}
.cp-demo__frame{position:relative;width:100%;max-width:640px;margin:0 auto;aspect-ratio:16/9;
  border-radius:16px;overflow:hidden;background:#0d0820;
  border:1px solid rgba(139,92,246,.35);box-shadow:0 18px 50px rgba(76,29,149,.28)}
.cp-demo__frame video{display:block;width:100%;height:100%;object-fit:contain;background:#0d0820}
.cp-demo__play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  border:0;padding:0;background:rgba(13,8,32,.28);cursor:pointer;transition:background .2s}
.cp-demo__play:hover{background:rgba(13,8,32,.10)}
.cp-demo__play span{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#8b5cf6,#6366f1);box-shadow:0 8px 28px rgba(99,102,241,.55);
  transition:transform .2s}
.cp-demo__play:hover span{transform:scale(1.07)}
.cp-demo__play svg{width:30px;height:30px;margin-left:4px;fill:#fff}
.cp-demo__expand{position:absolute;top:10px;right:10px;z-index:2;display:flex;align-items:center;gap:6px;
  padding:7px 12px;border:0;border-radius:999px;cursor:pointer;font-family:inherit;font-weight:600;font-size:13px;line-height:1;color:#fff;
  background:rgba(13,8,32,.72);backdrop-filter:blur(6px);transition:background .2s}
.cp-demo__expand:hover{background:rgba(99,102,241,.92)}
.cp-demo__expand svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cp-demo__overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
  padding:16px;background:rgba(8,5,20,.86);backdrop-filter:blur(4px);animation:cpDemoFade .18s ease-out}
.cp-demo__modal{position:relative;width:min(94vw,calc(86vh * 16 / 9));aspect-ratio:16/9;border-radius:12px;
  overflow:hidden;background:#000;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.cp-demo__modal video{display:block;width:100%;height:100%;object-fit:contain;background:#000}
.cp-demo__close{position:absolute;top:10px;right:10px;z-index:2;width:38px;height:38px;border:0;border-radius:50%;
  cursor:pointer;font-size:18px;line-height:1;color:#fff;background:rgba(13,8,32,.75);transition:background .2s}
.cp-demo__close:hover{background:rgba(99,102,241,.95)}
@keyframes cpDemoFade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.cp-demo__overlay{animation:none}.cp-demo__play span{transition:none}}
`;

export default function DemoVideo({
  id = "demo-section",
  heading = "See CoPrompt in action",
  subheading = "A 65-second walkthrough — from setting up a hiring decision to a finalised, defensible outcome.",
  src = "/demo/coprompt-demo.mp4",
  poster = "/demo/coprompt-demo-poster.jpg",
}) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const inlineRef = useRef(null);
  const modalRef = useRef(null);
  const expandBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const resumeAt = useRef(0);

  const openModal = useCallback(() => {
    const v = inlineRef.current;
    if (v) {
      resumeAt.current = v.currentTime || 0;
      v.pause();
    }
    setOpen(true);
  }, []);

  // Lets a button ANYWHERE on the page open this video — e.g. a hero CTA —
  // without needing to import or know about this component directly:
  //   window.dispatchEvent(new CustomEvent("coprompt:open-demo"))
  // Pair with href="#demo-section" on that button so it still scrolls to
  // this section underneath; closing the video then lands the visitor here.
  useEffect(() => {
    const onOpenRequest = () => openModal();
    window.addEventListener("coprompt:open-demo", onOpenRequest);
    return () => window.removeEventListener("coprompt:open-demo", onOpenRequest);
  }, [openModal]);

  const closeModal = useCallback(() => {
    const m = modalRef.current;
    const v = inlineRef.current;
    if (m && v && m.currentTime) {
      try { v.currentTime = m.currentTime; } catch (e) { /* ignore */ }
    }
    setOpen(false);
  }, []);

  // While the large view is open: Esc closes it, page scroll is locked, focus moves in and back out.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeBtnRef.current) closeBtnRef.current.focus();
    const trigger = expandBtnRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (trigger) trigger.focus();
    };
  }, [open, closeModal]);

  const startInline = () => {
    const v = inlineRef.current;
    if (v) v.play().catch(() => {});
  };

  return (
    <section id={id} className="cp-demo">
      <style>{CSS}</style>
      <h2 className="cp-demo__title">{heading}</h2>
      <p className="cp-demo__sub">{subheading}</p>

      <div className="cp-demo__frame">
        {/* preload="none": the video file is only downloaded when someone presses play */}
        <video
          ref={inlineRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="none"
          onPlay={() => setStarted(true)}
        />
        {!started && (
          <button type="button" className="cp-demo__play" onClick={startInline} aria-label="Play demo video">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </button>
        )}
        <button
          type="button"
          ref={expandBtnRef}
          className="cp-demo__expand"
          onClick={openModal}
          aria-label="Expand video"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Expand
        </button>
      </div>

      {open && (
        <div className="cp-demo__overlay" role="dialog" aria-modal="true" aria-label="CoPrompt demo video" onClick={closeModal}>
          <div className="cp-demo__modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" ref={closeBtnRef} className="cp-demo__close" onClick={closeModal} aria-label="Close video">
              ✕
            </button>
            <video
              ref={modalRef}
              src={src}
              poster={poster}
              controls
              autoPlay
              playsInline
              onLoadedMetadata={(e) => {
                if (resumeAt.current > 0) e.currentTarget.currentTime = resumeAt.current;
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
