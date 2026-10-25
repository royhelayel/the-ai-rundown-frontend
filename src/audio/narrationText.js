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

// One full stop to a sentence: appending one to a takeaway that already ended in one made "..".
export const endSentence = (t) => (/[.!?…"”’')]$/.test(t) ? t : `${t}.`);

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

export function categoryTransition(category, language = 'en') {
  const names = { 'World News': 'world news', UAE: 'the United Arab Emirates', KSA: 'Saudi Arabia', QAT: 'Qatar', LEB: 'Lebanon', AI: 'artificial intelligence', Crypto: 'cryptocurrency' };
  const arabic = { 'World News': 'أخبار العالم', Technology: 'التكنولوجيا', Business: 'الاقتصاد', Politics: 'السياسة', Sports: 'الرياضة', Entertainment: 'الثقافة', Science: 'العلوم', Health: 'الصحة', UAE: 'الإمارات', KSA: 'السعودية', QAT: 'قطر', LEB: 'لبنان', AI: 'الذكاء الاصطناعي', Crypto: 'العملات الرقمية', Football: 'كرة القدم', Basketball: 'كرة السلة' };
  return language === 'ar' ? `ننتقل الآن إلى ${arabic[category] || category}.` : `Now, ${names[category] || category.toLowerCase()}.`;
}

export function narrationSeekOffset(text, percent) {
  const words = [...text.matchAll(/\S+/g)];
  if (!words.length) return 0;
  const target = text.length * Math.max(0, Math.min(100, percent)) / 100;
  const word = words.find(w => w.index + w[0].length > target) || words[words.length - 1];
  return word.index;
}
