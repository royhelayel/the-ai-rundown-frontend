import { DESIGN_CSS } from '../design';

export default function GlobalStyles() {
  return (
      <style>{`
        @font-face { font-family:'RadioNews Editorial'; src:url('/pilot-assets/Inter.ttf') format('truetype'); font-weight:100 900; font-style:normal; font-display:swap; }
        :root { --body-max: 600px; }
        ${DESIGN_CSS}
        * { box-sizing: border-box; }
        html, body { background: var(--paper); color: var(--ink); margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sk-shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .sk { background: linear-gradient(90deg, var(--panel) 25%, var(--line) 50%, var(--panel) 75%); background-size: 1200px 100%; animation: sk-shimmer 1.4s ease-in-out infinite; }
        /* ── Animated gradient buttons ── */
        @keyframes border-flow {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        /* Read — cool blues / purples / cyans */
        .ai-btn-wrap-read {
          position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#6366f1,#3b82f6,#0891b2,#06b6d4,#8b5cf6,#6366f1,#0ea5e9,#6366f1);
          background-size: 300% 100%;
          animation: border-flow 6s ease-in-out infinite;
        }
        /* Play — warm ambers / oranges / reds / pinks */
        .ai-btn-wrap-play {
          position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#f59e0b,#f97316,#ef4444,#e11d48,#ec4899,#d97706,#f59e0b,#f97316);
          background-size: 300% 100%;
          animation: border-flow 6s ease-in-out infinite;
        }
        /* keep old name as alias for play (backward compat) */
        .ai-btn-wrap { position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#f59e0b,#f97316,#ef4444,#e11d48,#ec4899,#d97706,#f59e0b,#f97316);
          background-size: 300% 100%; animation: border-flow 6s ease-in-out infinite;
        }
        .ai-btn-inner {
          width: auto; padding: 0.6rem 1.4rem; border-radius: 11px;
          background: linear-gradient(135deg,#18182a 0%,#1e1b35 100%);
          border: none; color: white; font-size: 0.88rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; letter-spacing: -0.01em; transition: opacity 0.15s; font-family: inherit;
        }
        .ai-btn-inner:hover { opacity: 0.9; }
        .ai-btn-inner-white {
          width: auto; padding: 0.6rem 1.4rem; border-radius: 11px;
          background: #ffffff;
          border: none; color: #0a0a0f; font-size: 0.88rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; letter-spacing: -0.01em; transition: opacity 0.15s; font-family: inherit;
        }
        .ai-btn-inner-white:hover { opacity: 0.9; }
        /* ── Hero row responsive layout ── */
        .hero-row { display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.25rem; }
        .hero-title-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: nowrap; justify-content: space-between; }
        .hero-play-row .ai-btn-wrap, .hero-play-row .ai-btn-wrap-play, .hero-play-row .ai-btn-wrap-read { display: block; width: 100%; }
        .hero-play-row .ai-btn-inner { width: 100%; justify-content: center; border-radius: 14px; }
      `}</style>
  );
}
