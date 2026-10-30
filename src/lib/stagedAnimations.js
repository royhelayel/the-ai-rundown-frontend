import records from '../components/storyLed/stagedStories.json';
import { cleanForTTS } from '../audio/narrationText';
const normalize = text => cleanForTTS(String(text || '')).replace(/\s+/g, ' ').trim();
// Roy approved these three deployed motion samples for the live app on Oct 31.
// Exact scripts only: corrections and unrelated editions cannot inherit stale facts.
const approved = new Map(records.map(row => [normalize(row.text), {type:'staged', plan:row.plan, text:normalize(row.text)}]));
export const stagedFor = text => approved.get(normalize(text)) || null;
