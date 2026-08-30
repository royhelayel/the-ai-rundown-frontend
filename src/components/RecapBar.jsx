import React from 'react';
import { FileText, Play } from 'lucide-react';
import CircleAction from './CircleAction';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';

/**
 * RecapBar — the category's one-minute summary, as an item rather than a button.
 *
 * It kept getting lost as a chip in the header because it was the only piece of *content*
 * being rendered as chrome. Given the same shape as a story card — icon, title, meta, a play
 * affordance — it reads as something to consume, which is what it is.
 *
 * Tapping the body opens the recap; tapping play narrates it.
 */
export default function RecapBar({ category, storyCount = 0, theme = 'light', compact = false, onOpen, onPlay }) {
  const dark = theme === 'dark';
  const accent = dark ? '#a5b4fc' : (CATEGORY_COLORS[category] || '#6366f1');
  const name = CATEGORY_SHORT[category] || category;

  // The same circle-and-caption pair the story cards carry, so a recap and a story offer
  // their actions in one shape rather than two — this row sits directly above the first
  // card, where a pair of pills read as a different kind of control entirely.
  const actions = (
    <>
      <CircleAction
        Icon={FileText}
        label="Read"
        accent={accent}
        theme={dark ? 'dark' : 'light'}
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        aria-label={`Read the ${name} recap`}
      />
      {onPlay && (
        <CircleAction
          Icon={Play}
          label="Listen"
          variant="filled"
          accent={accent}
          theme={dark ? 'dark' : 'light'}
          iconProps={{ fill: dark ? '#0a0a14' : '#fff', color: dark ? '#0a0a14' : '#fff', style: { marginLeft: 1 } }}
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          aria-label={`Listen to the ${name} recap`}
        />
      )}
    </>
  );

  // Compact: a chip sized to its own content, not a full-width filled bar.
  //
  // It used to spell out "{Name} Category recap" and carry two labelled buttons, Read and
  // Listen. Directly beneath it the story card carries Summary and Listen — the same two
  // verbs, forty pixels apart, at different scopes, which is a real "which one did I just
  // tap" problem rather than only visual noise. So the words go: the chip body is the read
  // affordance and the trailing icon is listen, which leaves exactly one pair of labelled
  // buttons on the screen — the card's.
  //
  // The name goes too. The active category pill sits directly above this, so "Tech Category
  // recap" said Tech twice within a hundred pixels; "Recap · 1 min" says the part that isn't
  // already on screen. Ghost rather than filled for the same reason: this is a secondary
  // offer next to the story, and a filled block competed with the card for first read.
  if (compact) {
    return (
      <div style={{ display: 'flex' }}>
        <div onClick={onOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '4px 4px 4px 10px', borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.16)' : `${accent}40`}`,
            background: dark ? 'rgba(255,255,255,0.04)' : `${accent}0f` }}>
          <FileText size={13} color={accent} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
            color: dark ? 'rgba(255,255,255,0.88)' : '#0a0a0f' }}>
            Category Recap <span style={{ fontWeight: 600, color: dark ? 'rgba(255,255,255,0.45)' : '#6b7280' }}>· 1 min</span>
          </span>
          {onPlay && (
            <button onClick={(e) => { e.stopPropagation(); onPlay(); }} aria-label={`Listen to the ${name} recap`}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: dark ? 'rgba(255,255,255,0.92)' : accent }}>
              <Play size={9} fill={dark ? '#0a0a14' : '#fff'} color={dark ? '#0a0a14' : '#fff'} style={{ marginLeft: 1 }} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
        background: dark ? 'rgba(165,180,252,0.14)' : `${accent}17`,
      }}
    >
      <FileText size={16} color={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: dark ? '#fff' : '#0a0a0f' }}>
          {name} recap
        </p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: dark ? 'rgba(255,255,255,0.55)' : '#6b7280' }}>
          {storyCount} {storyCount === 1 ? 'story' : 'stories'} · 1 min
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{actions}</div>
    </div>
  );
}
