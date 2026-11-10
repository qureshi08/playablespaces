// Several honest rankings for one set, so every set has something real to be proud of (Strava's idea: PRs, trophies,
// segments, never one number). Nothing is invented: each badge is either your own history, a published band, or a
// published norm. The headline is the strongest badge you actually won; the age rank is always shown, never hidden.
import { pushupRank } from './norms.js';

// Push up clubs = the bands in Yang et al. 2019, JAMA Network Open (1,104 men followed for 10 years): 0 to 10, 11 to 20,
// 21 to 30, 31 to 40, more than 40. Men in the 40+ band had 96% fewer heart events than men in the 0 to 10 band.
const CLUBS = [[11, '11+'], [21, '21+'], [31, '31+'], [41, '40+']];

export function pushupRanks(n, no, age, sex, prev = []) {
  const list = [];
  // 1. you against you
  const best = prev.length ? Math.max(...prev) : null;
  if (best == null) list.push({ k: 'pb', title: 'personal best', value: 'first set logged', sub: 'your number to beat', win: n > 0, score: 1 });
  else if (n > best) list.push({ k: 'pb', title: 'personal best', value: `new best, +${n - best}`, sub: `up from ${best}`, win: true, score: 5 });
  else if (n === best) list.push({ k: 'pb', title: 'personal best', value: 'tied your best', sub: `${best} again`, win: true, score: 2 });
  else list.push({ k: 'pb', title: 'personal best', value: `best is ${best}`, sub: `${best - n} off it`, win: false, score: 0 });
  // 2. the clubs
  const club = [...CLUBS].reverse().find(c => n >= c[0]), next = CLUBS.find(c => n < c[0]);
  if (club) list.push({ k: 'club', title: 'push up club', value: club[1] + ' club', sub: next ? `${next[0] - n} more for the ${next[1]} club` : 'the top club', win: true, score: club[0] >= 41 ? 6 : club[0] >= 31 ? 4 : club[0] >= 21 ? 3 : 2.5, short: club[1] });
  else list.push({ k: 'club', title: 'push up club', value: `${11 - n} to the 11+ club`, sub: 'the first club starts at 11', win: false, score: 0, short: '-' });
  // 3. form: how many of your attempts were full reps
  const tot = n + no, clean = tot ? Math.round(n / tot * 100) : 0;
  list.push({ k: 'form', title: 'form', value: `${clean}% clean`, sub: no ? `${no} half rep${no > 1 ? 's' : ''} called out` : 'not one half rep', win: n >= 3 && clean >= 80, score: no === 0 && n >= 3 ? 3 : clean >= 80 ? 1.5 : 0 });
  // 4. your age group, from the published norms
  const r = pushupRank(n, age, sex);
  list.push({ k: 'age', title: 'vs ' + r.who, value: r.p >= 50 ? `top ${Math.max(1, 100 - r.p)}%` : `better than ${r.p}%`, sub: 'of ' + r.who, src: r.src, win: r.p >= 50, score: r.p >= 50 ? 2 + (r.p - 50) / 8 : 0 });
  const wins = list.filter(b => b.win).sort((a, b) => b.score - a.score);
  const head = wins[0] || list.find(b => b.k === 'club');
  return { list, head, tags: wins.filter(b => b !== head).map(b => b.value), rank: r, age: list[3] };
}
