import React, { useEffect, useRef, useState } from 'react';
import { topicVars } from '../design';
import { centrePill } from '../utils';
import './SummaryTypeSelector.css';

export const SUMMARY_TYPES = [
  { value: 'Headlines', label: 'Headlines' },
  { value: 'Daily', label: 'Daily recap' },
  { value: 'Weekly', label: 'Last week' },
  { value: 'Monthly', label: 'Last month' },
];

export default function SummaryTypeSelector({ value = 'Headlines', onChange, category }) {
  const strip = useRef(null);
  const selected = useRef(null);
  const initial = useRef(true);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = strip.current;
    const measure = () => setEdges({ left: el.scrollLeft > 2, right: el.scrollWidth - el.clientWidth - el.scrollLeft > 2 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); el.removeEventListener('scroll', measure); };
  }, []);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    centrePill(strip.current, selected.current, !initial.current && !reduced);
    initial.current = false;
  }, [value]);
  return <div className="rn-summary-viewport rn-tp" style={topicVars(category)} data-left={edges.left} data-right={edges.right}>
    <div ref={strip} className="rn-summary-strip" role="group" aria-label="Summary type">
      {SUMMARY_TYPES.map(option => <button key={option.value} ref={value === option.value ? selected : null}
        className="rn-btn rn-summary-choice" aria-pressed={value === option.value}
        onClick={() => value !== option.value && onChange?.(option.value)}>{option.label}</button>)}
    </div>
  </div>;
}
