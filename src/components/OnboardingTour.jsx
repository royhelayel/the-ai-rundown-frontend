import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Headphones, Play, ArrowUp, AlignLeft, Check, ArrowRight, Newspaper } from 'lucide-react';
import './OnboardingTour.css';
import Wordmark from './Wordmark';
import Logo from './Logo';

export const ONBOARDING_KEY = 'rundown_onboarding_seen';

const SLIDES = [
  { label: 'Listen', eyebrow: 'Fresh news. Fits your day.', title: 'Your daily podcast for fresh news summaries', body: 'Catch up on news hands-free. Listen while you walk, commute or get on with your day. Your news briefs play one after another across your chosen categories. Watch the animation, or turn it off and keep listening.' },
  { label: 'Summaries', eyebrow: 'Less repetition. More understanding.', title: 'Different news outlets. One short summary.', body: 'Related coverage from different news outlets, brought together in short summaries. Get the essentials, with links to the original reporting.' },
  { label: 'Read', eyebrow: 'Stay informed. Your way.', title: 'Prefer to read?', body: 'Tap Read on any brief to pause the audio and swipe up through the updates. Tap Listen to pick up where you left off.' },
  { label: 'Recaps', eyebrow: 'Step back. See what changed.', title: 'A brief that fits your time.', body: 'Choose Quick brief for a short daily overview, or Full brief to hear each story summary. Step back with Last week and Last month. Every option works for listening and reading.' },
  { label: 'Categories', eyebrow: 'Your interests. Your news.', title: 'Follow what matters to you.', body: 'Choose your news categories and build your own news mix. Change it whenever your interests change.' },
];

function TourPreview({ index }) {
  const [readingMode, setReadingMode] = useState('Text only');
  const [period, setPeriod] = useState('Last week');
  const [categories, setCategories] = useState(['World', 'Technology']);
  if (index === 0) return <div className="intro-demo intro-listen">
    <Logo size={48} decorative />
    <span className="intro-small">YOUR DAILY NEWS MIX</span>
    <strong>The world moves.<br />Stay in the know.</strong>
    <div className="intro-player" aria-hidden="true"><span className="intro-wave">{[12, 24, 17, 32, 22, 14, 28, 19, 34, 16, 24, 12].map((height, i) => <i key={i} style={{ height }} />)}</span><span className="intro-play"><Play size={22} fill="currentColor" /></span></div>
    <div className="intro-queue"><span>World</span><ArrowRight size={14} aria-hidden="true" /><span>Technology</span><ArrowRight size={14} aria-hidden="true" /><span>More</span></div>
  </div>;
  if (index === 1) return <div className="intro-demo">
    <span className="intro-small">RELATED COVERAGE</span>
    <div className="intro-outlets"><span>Outlet A</span><span>Outlet B</span><span>Outlet C</span></div>
    <div className="intro-divider" />
    <Newspaper size={26} aria-hidden="true" /><strong>One story.<br />The essentials, together.</strong>
    <span className="intro-note">Original sources within reach</span>
  </div>;
  if (index === 2) return <div className="intro-demo">
    <div className="intro-choices" role="group" aria-label="Preview reading modes">{['Text + audio', 'Text only'].map(mode => <button key={mode} type="button" aria-pressed={mode === readingMode} onClick={() => setReadingMode(mode)}>{mode}</button>)}</div>
    {readingMode === 'Text only' ? <ArrowUp size={28} aria-hidden="true" /> : <AlignLeft size={28} aria-hidden="true" />}
    <strong>{readingMode === 'Text only' ? 'One update at a time.' : 'Your audio, with the text.'}</strong>
    <p>{readingMode === 'Text only' ? 'Swipe up for the next update. Tap Listen to return to audio.' : 'Turn animation off to follow the text while the audio continues.'}</p>
  </div>;
  if (index === 3) return <div className="intro-demo">
    <div className="intro-choices" role="group" aria-label="Preview recap periods">{['Quick brief', 'Full brief', 'Last week', 'Last month'].map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div>
    <span className="intro-small">WORLD · {period.toUpperCase()}</span>
    <strong>{period === 'Quick brief' ? 'The essentials, in one go.' : period === 'Full brief' ? 'Every story, one after another.' : period === 'Last week' ? 'The week in perspective.' : 'The month in perspective.'}</strong>
    <div className="intro-queue"><Headphones size={18} aria-hidden="true" /><span>Listen</span><span aria-hidden="true">·</span><AlignLeft size={18} aria-hidden="true" /><span>Read</span></div>
    <span className="intro-note">Recaps appear when available</span>
  </div>;
  return <div className="intro-demo">
    <span className="intro-small">A NEWS MIX THAT FEELS LIKE YOU</span>
    <div className="intro-categories" role="group" aria-label="Example news categories">{['World', 'Technology', 'Business', 'Health', 'Science', 'Sports'].map(category => <button type="button" key={category} aria-pressed={categories.includes(category)} onClick={() => setCategories(current => current.includes(category) ? current.filter(c => c !== category) : [...current, category])}>{category}{categories.includes(category) && <Check size={14} aria-hidden="true" />}</button>)}</div>
    <span className="intro-note">Try a selection here. Use the topic controls to choose your mix.</span>
  </div>;
}

export default function OnboardingTour({ onClose, onFinish = onClose }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef(null);
  const heading = useRef(null);
  const initial = useRef(true);
  const slide = SLIDES[index];
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (node.showModal) node.showModal(); else node.setAttribute('open', '');
    return () => {
      document.body.style.overflow = previousOverflow;
      if (node.close) node.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    heading.current?.focus();
    dialog.current?.scrollTo?.({ top: 0 });
  }, [index]);
  return createPortal(<dialog ref={dialog} className="intro-tour" aria-labelledby="intro-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="intro-shell">
      <header className="intro-header"><Wordmark /><button type="button" className="intro-skip" onClick={onClose}>Skip</button></header>
      <nav className="intro-nav" aria-label="Tour steps">{SLIDES.map((item, i) => <button type="button" key={item.label} aria-current={index === i ? 'step' : undefined} onClick={() => setIndex(i)}>{item.label}</button>)}</nav>
      <TourPreview index={index} />
      <section className="intro-copy"><div className="intro-small">{slide.eyebrow}</div><h2 id="intro-title" ref={heading} tabIndex={-1}>{slide.title}</h2><p>{slide.body}</p></section>
      <footer className="intro-footer"><span className="intro-note" aria-live="polite">{index + 1} of {SLIDES.length}</span><div className="intro-progress" aria-hidden="true">{SLIDES.map((_, i) => <span key={i} className={i <= index ? 'complete' : ''} />)}</div><div className="intro-actions">{index > 0 && <button type="button" onClick={() => setIndex(i => i - 1)}>Back</button>}<button type="button" className="intro-primary" onClick={() => index === SLIDES.length - 1 ? onFinish() : setIndex(i => i + 1)}>{index === SLIDES.length - 1 ? 'Start exploring' : 'Continue'}<ArrowRight size={17} aria-hidden="true" /></button></div></footer>
    </div>
  </dialog>, document.body);
}
