/**
 * InterestingButton — the "mark as Interesting" control, shared by the Scroll-mode card
 * (StoryCard), the Swipe-mode card (StoryReader) and the player.
 *
 * Now a thin wrapper over CircleAction, which is the shape all three card actions share.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import CircleAction from './CircleAction';

export default function InterestingButton({ active, onClick, theme = 'light' }) {
  return (
    <CircleAction
      Icon={Sparkles}
      label="Interesting"
      active={active}
      onClick={onClick}
      theme={theme}
      iconProps={{ fill: active ? 'currentColor' : 'none' }}
      aria-label={active ? 'Remove from Interesting' : 'Mark as Interesting'}
    />
  );
}
