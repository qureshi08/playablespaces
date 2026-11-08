// every test in one list, with its home page group
import { APPS } from './apps.js';
import { APPS2, ALL_TITLES } from './apps2.js';
import { BODYAGE } from './bodyage.js';
export const ALL = { bodyage: BODYAGE, ...APPS, ...APPS2 };
// hero: Body Age. bench: one test, one rank. hard: athlete dares. play: games for friends and family.
const GROUP = {
  bodyage: 'hero',
  vjump: 'bench', reaction: 'bench', balance: 'bench', plank: 'bench', ghost: 'bench', pushup: 'bench',
  squat: 'bench', sprint: 'bench', broadjump: 'bench', sitreach: 'bench', rope: 'bench', burpee: 'bench', wallsit: 'bench', deadhang: 'bench', runform: 'bench', kneecheck: 'bench', daily: 'bench',
  pullup: 'hard', handstand: 'hard', lever: 'hard', lsit: 'hard', pistol: 'hard', dips: 'hard', barpath: 'hard', falsestart: 'hard',
  holewall: 'play', simon: 'play', dodge: 'play', nolaugh: 'play', jacksrace: 'play', freezedance: 'play', sixcorner: 'play', shotspeed: 'play', keepyups: 'play',
};
Object.values(ALL).forEach(a => { ALL_TITLES[a.id] = a.title; a.group = GROUP[a.id] || 'bench'; });
export const TOP_BENCH = ['vjump', 'reaction', 'balance', 'plank', 'ghost', 'pushup'];
