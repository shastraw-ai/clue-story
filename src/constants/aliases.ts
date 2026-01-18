// Merged alias pool (no gender distinction)
export const ALIASES = [
  'Alex',
  'Alice',
  'Ben',
  'Bella',
  'Charlie',
  'Claire',
  'David',
  'Diana',
  'Ethan',
  'Emma',
  'Finn',
  'Fiona',
  'George',
  'Grace',
  'Henry',
  'Hannah',
  'Isaac',
  'Ivy',
  'Jack',
  'Julia',
];

// Legacy exports for backwards compatibility during migration
export const BOY_ALIASES = ALIASES.filter((_, i) => i % 2 === 0);
export const GIRL_ALIASES = ALIASES.filter((_, i) => i % 2 === 1);
