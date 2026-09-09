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
// The tint arrives as #rrggbb on light and as rgb(r, g, b) on dark (tintForDark builds it
// that way), so appending an alpha suffix would only work for one of them.
function hexA(c, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || '');
  if (m) return `rgba(${parseInt(m[1],16)}, ${parseInt(m[2],16)}, ${parseInt(m[3],16)}, ${a})`;
  const r = /rgba?\(([^)]+)\)/.exec(c || '');
  if (r) return `rgba(${r[1].split(',').slice(0,3).map(v=>v.trim()).join(', ')}, ${a})`;
  return `rgba(99, 102, 241, ${a})`;
}

export default function RecapBar({ category, storyCount = 0, theme = 'light', compact = false, showName = false, accent: accentProp, onOpen, onPlay }) {
  const dark = theme === 'dark';
  // The parents already compute the category's tint for the active topic tab — they pass it
  // down rather than a third copy of tintForDark living here. Falling back keeps the
  // non-compact variant, and any caller that doesn't tint, working unchanged.
  const accent = accentProp || (dark ? '#a5b4fc' : (CATEGORY_COLORS[category] || '#6366f1'));
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
  // The name goes too, where one chip serves one category: the active pill sits directly
  // above it, so "Tech Category recap" said Tech twice within a hundred pixels. `showName`
  // puts it back for Scroll, where a chip heads each of twelve sections and nothing else
  // says which one it belongs to. Ghost rather than filled either way: this is a secondary
  // offer next to the story, and a filled block competed with the card for first read.
  if (compact) {
    // One pill among three, and the shortest label of them: "Today", against "Last week" and
    // "Last month". The minutes are gone — three durations on one line was the row spending
    // its width on the least useful thing it could say.
    //
    // The fill is the category's own tint, the same value the active topic tab is drawn in.
    // That is what ties this row to the topic without naming it again: change topic and the
    // tab and these pills move together, because both read one source.
    return (
      <button onClick={onOpen} title={`Read the ${name} recap`}
        style={{ border: 'none', cursor: 'pointer', flexShrink: 0,
          padding: '6px 11px', borderRadius: 999,
          fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
          background: hexA(accent, dark ? 0.20 : 0.13),
          color: accent }}>
        Today
      </button>
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
