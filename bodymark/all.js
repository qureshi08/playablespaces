// every test in one list, plus the launch plan: Bodymark launches small (Body Age only) and drops one test a week,
// the way Farza ships HeyClicky (one thing, then a small launch every week, each with its own demo video).
import { APPS } from './apps.js';
import { APPS2, ALL_TITLES } from './apps2.js';
import { BODYAGE } from './bodyage.js';
import { PUSHUPS } from './coach.js';
export const ALL = { pushups: PUSHUPS, bodyage: BODYAGE, ...APPS, ...APPS2 };
const GROUP = {
  bodyage: 'hero',
  vjump: 'bench', reaction: 'bench', balance: 'bench', plank: 'bench', ghost: 'bench', pushup: 'bench',
  pullup: 'hard', handstand: 'hard', lever: 'hard',
  holewall: 'play', nolaugh: 'play', jacksrace: 'play', freezedance: 'play',
};
Object.values(ALL).forEach(a => { ALL_TITLES[a.id] = a.title; a.group = GROUP[a.id] || 'bench'; });

// Weekly drops: each unlocks on its date (Saturdays, so the demo can be filmed at the weekend). Anas posts its video that day.
// 2026-11-10: the old queue (Bolt race etc.) was pulled. Anas: no setup, no friction, only accurate things. The new list comes from research.
// Ground drops (2026-11-10): everything works on plain ground with the phone leaned on a shoe. demo = preview animation id.
export const DROPS = [
  { id: 'oneleg', demo: 'balance', date: '2026-11-21', pitch: 'can you stand on one leg for 10 seconds?' },
  { id: 'squats', demo: 'squat', date: '2026-11-28', pitch: "half squats don't count" },
  { id: 'plank', demo: 'plank', date: '2026-12-05', pitch: 'a plank timer that stops when you cheat' },
  { id: 'sitrise', demo: 'bodyage', date: '2026-12-12', pitch: 'sit on the ground, stand up with no hands' },
  { id: 'jacks', demo: 'jacksrace', date: '2026-12-19', pitch: 'how many jumping jacks in 15 seconds?' },
  { id: 'burpees', demo: 'burpee', date: '2026-12-26', pitch: 'only full burpees count' },
];
const today = () => new Date().toISOString().slice(0, 10);
export const released = () => ['pushups', ...DROPS.filter(d => d.date <= today() && ALL[d.id]).map(d => d.id)];
export const nextDrop = () => DROPS.find(d => d.date > today()) || null;
// tests cut in the 2026-11-10 rethink (no hook, weak demo, or rough on a phone camera): hidden now, deleted once Anas confirms
export const CUT = ['squat', 'pistol', 'dips', 'lsit', 'wallsit', 'deadhang', 'burpee', 'sitreach', 'rope', 'runform', 'kneecheck', 'barpath', 'falsestart', 'broadjump', 'shotspeed', 'keepyups', 'sixcorner', 'simon', 'dodge', 'balance', 'sprint', 'daily'];
export const TOP_BENCH = ['vjump', 'reaction', 'balance', 'plank', 'ghost', 'pushup'];
