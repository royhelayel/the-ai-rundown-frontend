import React from 'react';
import StoryLedScene from './StoryLedScene';
import { storyLedPhase } from '../../lib/storyLedAnimations';
import './storyLed.css';

export default function StoryLedAnimation({ illustration, phase, reduced = false }) {
  const position = reduced ? 1 : storyLedPhase(illustration, phase);
  return <div className="rn-story-led" data-story={illustration.story} data-phase={position}>
    <StoryLedScene index={illustration.index} phase={position} />
    {illustration.story === 'phobos' && <span className="rn-story-led-note">Conceptual mission path · not to scale</span>}
  </div>;
}
