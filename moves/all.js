// every app in one list, grouped by category for the home page
import { APPS } from './apps.js';
import { APPS2, ALL_TITLES } from './apps2.js';
export const ALL = { ...APPS, ...APPS2 };
Object.values(ALL).forEach(a => { ALL_TITLES[a.id] = a.title; });
export const CATS = ['Speed', 'Power', 'Calisthenics', 'Home fitness', 'Running', 'Ball sports', 'Challenges', 'Family', 'Athlete data'];
