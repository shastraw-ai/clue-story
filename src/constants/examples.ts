import { Subject } from '../types';

export const SUBJECTS: { label: string; value: Subject }[] = [
  { label: 'Math', value: 'math' },
  { label: 'Reading', value: 'reading' },
];

export const EXAMPLE_THEMES = [
  'Cloud Kingdom',
  'Underwater Expedition',
  'Enchanted Forest',
  'Space Station',
  'Pirate Island',
  'Dinosaur Valley',
];

export const EXAMPLE_ROLES = [
  'Detectives',
  'Treasure Hunters',
  'Explorers',
  'Scientists',
  'Time Travelers',
  'Secret Agents',
];

export const GRADES = [
  { label: 'Kindergarten', value: 'K' },
  { label: '1st Grade', value: '1' },
  { label: '2nd Grade', value: '2' },
  { label: '3rd Grade', value: '3' },
  { label: '4th Grade', value: '4' },
  { label: '5th Grade', value: '5' },
  { label: '6th Grade', value: '6' },
  { label: '7th Grade', value: '7' },
  { label: '8th Grade', value: '8' },
  { label: '9th Grade', value: '9' },
  { label: '10th Grade', value: '10' },
  { label: '11th Grade', value: '11' },
  { label: '12th Grade', value: '12' },
];

export const MAX_KIDS = 5;
export const MAX_QUESTIONS_PER_KID = 5;
