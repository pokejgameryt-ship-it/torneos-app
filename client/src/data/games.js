export const GAMES_LIST = [
  { id: 'ssbu', name: 'Super Smash Bros Ultimate', category: 'Fighting', icon: '🎮' },
  { id: 'sf6', name: 'Street Fighter 6', category: 'Fighting', icon: '👊' },
  { id: 'tekken8', name: 'Tekken 8', category: 'Fighting', icon: '🥊' },
  { id: 'ggst', name: 'Guilty Gear Strive', category: 'Fighting', icon: '🎸' },
  { id: 'dbfz', name: 'Dragon Ball FighterZ', category: 'Fighting', icon: '🐉' },
  { id: 'mbtl', name: 'Melty Blood: Type Lumina', category: 'Fighting', icon: '🌙' },
  { id: 'bbtag', name: 'BlazBlue: Cross Tag Battle', category: 'Fighting', icon: '⚔️' },
  { id: 'mk1', name: 'Mortal Kombat 1', category: 'Fighting', icon: '💀' },
  { id: 'ki', name: 'Killer Instinct', category: 'Fighting', icon: '🔥' },
  { id: 'brawlhalla', name: 'Brawlhalla', category: 'Fighting', icon: '⚔️' },
  { id: 'rivals2', name: 'Rivals of Aether 2', category: 'Fighting', icon: '🐾' },

  { id: 'pokemon-sv', name: 'Pokemon Scarlet/Violet', category: 'RPG', icon: '⚡' },
  { id: 'pokemon-unite', name: 'Pokemon UNITE', category: 'MOBA', icon: '⚡' },
  { id: 'pokemon-tefl', name: 'Pokemon TCG Live', category: 'TCG', icon: '🃏' },
  { id: 'vgc-2025', name: 'Pokemon VGC 2025', category: 'RPG', icon: '🏆' },

  { id: 'lol', name: 'League of Legends', category: 'MOBA', icon: '🏆' },
  { id: 'val', name: 'Valorant', category: 'FPS', icon: '🔫' },
  { id: 'cs2', name: 'Counter-Strike 2', category: 'FPS', icon: '💣' },
  { id: 'ow2', name: 'Overwatch 2', category: 'FPS', icon: '🎯' },
  { id: 'rl', name: 'Rocket League', category: 'Sports', icon: '🚗' },
  { id: 'fortnite', name: 'Fortnite', category: 'Battle Royale', icon: '🏗️' },
  { id: 'apex', name: 'Apex Legends', category: 'Battle Royale', icon: '🎯' },
  { id: 'warzone', name: 'Call of Duty: Warzone', category: 'Battle Royale', icon: '🪖' },
  { id: 'pubg', name: 'PUBG: Battlegrounds', category: 'Battle Royale', icon: '🪖' },
  { id: 'fn-solo', name: 'Fortnite Solo', category: 'Battle Royale', icon: '🏗️' },

  { id: 'dota2', name: 'Dota 2', category: 'MOBA', icon: '🏰' },
  { id: 'hots', name: 'Heroes of the Storm', category: 'MOBA', icon: '🌀' },
  { id: 'smite', name: 'Smite 2', category: 'MOBA', icon: '⚡' },

  { id: 'sc2', name: 'StarCraft II', category: 'RTS', icon: '🚀' },
  { id: 'aoe2', name: 'Age of Empires II', category: 'RTS', icon: '🏰' },
  { id: 'aoe4', name: 'Age of Empires IV', category: 'RTS', icon: '🏰' },
  { id: 'wc3', name: 'Warcraft III', category: 'RTS', icon: '⚔️' },

  { id: 'chess', name: 'Chess', category: 'Strategy', icon: '♟️' },
  { id: 'ssbm', name: 'Super Smash Bros Melee', category: 'Fighting', icon: '🎮' },
  { id: 'ssb64', name: 'Super Smash Bros 64', category: 'Fighting', icon: '🎮' },

  { id: 'mk8', name: 'Mario Kart 8 Deluxe', category: 'Racing', icon: '🏎️' },
  { id: 'splat3', name: 'Splatoon 3', category: 'Shooter', icon: '🎨' },
  { id: 'arms', name: 'ARMS', category: 'Fighting', icon: '🥊' },

  { id: 'street-fighter-5', name: 'Street Fighter V', category: 'Fighting', icon: '👊' },
  { id: 'mk11', name: 'Mortal Kombat 11', category: 'Fighting', icon: '💀' },
  { id: 'injustice2', name: 'Injustice 2', category: 'Fighting', icon: '🦸' },

  { id: 'granblue', name: 'Granblue Fantasy Versus: Rising', category: 'Fighting', icon: '⚔️' },
  { id: 'undernight', name: 'Under Night In-Birth', category: 'Fighting', icon: '🌙' },
  { id: 'samsho', name: 'Samurai Shodown', category: 'Fighting', icon: '⚔️' },
  { id: 'kofxv', name: 'The King of Fighters XV', category: 'Fighting', icon: '👊' },

  { id: 'brawlhalla-2s', name: 'Brawlhalla 2v2', category: 'Fighting', icon: '⚔️' },
  { id: 'brawlhalla-ffa', name: 'Brawlhalla FFA', category: 'Fighting', icon: '⚔️' },

  { id: 'pokemon-unite-5v5', name: 'Pokemon UNITE 5v5', category: 'MOBA', icon: '⚡' },

  { id: 'other', name: 'Otro (especificar en descripción)', category: 'Otro', icon: '🎯' },
];

export function searchGames(query) {
  if (!query || !query.trim()) return GAMES_LIST;
  const q = query.toLowerCase();
  return GAMES_LIST.filter(g =>
    g.name.toLowerCase().includes(q) ||
    g.category.toLowerCase().includes(q) ||
    g.id.toLowerCase().includes(q)
  );
}
