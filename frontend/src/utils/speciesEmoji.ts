/**
 * Emoji mapping for wildlife species.
 * Maps lowercase species names to appropriate emojis.
 */

export const speciesEmoji: Record<string, string> = {
  // Whales
  'gray whale': '🐋',
  'grey whale': '🐋',
  'humpback whale': '🐋',
  'blue whale': '🐋',
  'fin whale': '🐋',
  'orca': '🐋',
  'killer whale': '🐋',

  // Dolphins
  'bottlenose dolphin': '🐬',
  'common dolphin': '🐬',
  'pacific white-sided dolphin': '🐬',
  'dolphin': '🐬',
  'porpoise': '🐬',

  // Sharks
  'white shark': '🦈',
  'great white shark': '🦈',
  'mako shark': '🦈',
  'blue shark': '🦈',
  'shark': '🦈',

  // Pinnipeds
  'california sea lion': '🦭',
  'sea lion': '🦭',
  'harbor seal': '🦭',
  'seal': '🦭',
  'elephant seal': '🦭',
  'pinniped': '🦭',

  // Birds
  'brown pelican': '🦅',
  'pelican': '🦅',
  'double-crested cormorant': '🦅',
  'cormorant': '🦅',
  'tern': '🐦',
  'albatross': '🐦',
  'shearwater': '🐦',
  'murre': '🐦',
  'puffin': '🐦',

  // Fish
  'garibaldi': '🐠',
  'mola mola': '🐟',
  'sunfish': '🐟',
};

/**
 * Get emoji for a species name.
 * @param species - Species name
 * @returns Emoji character, or '🐾' as fallback
 */
export function getSpeciesEmoji(species: string): string {
  const key = species.toLowerCase();
  return speciesEmoji[key] || '🐾';
}
