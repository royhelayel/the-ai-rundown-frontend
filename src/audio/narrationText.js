export const STORY_TRANSITIONS = [
  'Up next.',
  'Moving on.',
  'And now.',
  'Next story.',
  "Here's what else is happening.",
  'Our next story.',
];

export const CAT_TRANSITION_TEMPLATES = [
  (cat) => `Now let's turn to ${cat}.`,
  (cat) => `Next up, ${cat}.`,
  (cat) => `Moving on to ${cat}.`,
  (cat) => `Coming up, ${cat}.`,
];

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Strip markdown and symbols that TTS engines read aloud literally
export const cleanForTTS = (text) => text
  .replace(/\*\*(?:Coverage|التغطية|المصادر):\*\*[^\n]*/g, '')   // remove coverage lines entirely
  .replace(/\*\*([^*]+)\*\*/g, '$1')                              // **bold** → bold
  .replace(/_([^_]+)_/g, '$1')                                    // _italic_ → italic
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')                       // [text](url) → text
  .replace(/https?:\/\/\S+/g, '')                                 // bare URLs
  .replace(/·/g, ', ')                                            // middle dot → comma
  .replace(/\.{2,}/g, '.')                                        // ... → single dot
  .replace(/[#*`[\]()]/g, '')                                     // leftover symbols
  .replace(/\s{2,}/g, ' ')
  .trim();
