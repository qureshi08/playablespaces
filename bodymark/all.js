// every test in one list, plus the launch plan: Bodymark launches small (Body Age only) and drops one test a week,
// the way Farza ships HeyClicky (one thing, then a small launch every week, each with its own demo video).
import { APPS } from './apps.js';
import { APPS2, ALL_TITLES } from './apps2.js';
import { BODYAGE } from './bodyage.js';
export const ALL = { bodyage: BODYAGE, ...APPS, ...APPS2 };
const GROUP = {
  bodyage: 'hero',
  vjump: 'bench', reaction: 'bench', balance: 'bench', plank: 'bench', ghost: 'bench', pushup: 'bench',
  pullup: 'hard', handstand: 'hard', lever: 'hard',
  holewall: 'play', nolaugh: 'play', jacksrace: 'play', freezedance: 'play',
};
Object.values(ALL).forEach(a => { ALL_TITLES[a.id] = a.title; a.group = GROUP[a.id] || 'bench'; });

// Weekly drops: each unlocks on its date (Saturdays, so the demo can be filmed at the weekend). Anas posts its video that day.
export const DROPS = [
  { id: 'ghost', date: '2026-11-21', pitch: 'Race Usain Bolt\'s ghost over 10 m' },
  { id: 'reaction', date: '2026-11-28', pitch: 'How fast are your reflexes?' },
  { id: 'pullup', date: '2026-12-05', pitch: 'Only chin over bar counts' },
  { id: 'vjump', date: '2026-12-12', pitch: 'How rare is your vertical jump?' },
  { id: 'pushup', date: '2026-12-19', pitch: 'The AI only counts real push ups' },
  { id: 'plank', date: '2026-12-26', pitch: 'A plank timer that stops when you cheat' },
  { id: 'handstand', date: '2027-01-02', pitch: 'An AI judges your handstand' },
  { id: 'holewall', date: '2027-01-09', pitch: 'Match the hole before the wall hits you' },
  { id: 'jacksrace', date: '2027-01-16', pitch: 'Two people, one jumping jack race' },
  { id: 'lever', date: '2027-01-23', pitch: 'Is your front lever actually flat?' },
  { id: 'nolaugh', date: '2027-01-30', pitch: 'The AI catches your first smile' },
  { id: 'freezedance', date: '2027-02-06', pitch: 'When the music stops, the AI sees who moved' },
];
const today = () => new Date().toISOString().slice(0, 10);
export const released = () => ['bodyage', ...DROPS.filter(d => d.date <= today()).map(d => d.id)];
export const nextDrop = () => DROPS.find(d => d.date > today()) || null;
// tests cut in the 2026-11-10 rethink (no hook, weak demo, or rough on a phone camera): hidden now, deleted once Anas confirms
export const CUT = ['squat', 'pistol', 'dips', 'lsit', 'wallsit', 'deadhang', 'burpee', 'sitreach', 'rope', 'runform', 'kneecheck', 'barpath', 'falsestart', 'broadjump', 'shotspeed', 'keepyups', 'sixcorner', 'simon', 'dodge', 'balance', 'sprint', 'daily'];
export const TOP_BENCH = ['vjump', 'reaction', 'balance', 'plank', 'ghost', 'pushup'];
