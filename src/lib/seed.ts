// Coleção física identificada a partir das fotos da estante.
// Itens com "(confirmar)" na edição tiveram a plataforma/versão inferida pela lombada.

// `since`: versão do catálogo em que o jogo foi incluído. Bancos já existentes recebem só os jogos
// de versões mais novas que a deles (jogos removidos pelo usuário não voltam).
export type SeedGame = { title: string; platform: string; edition?: string; since?: number };

export const SEED_VERSION = 4;

const ps5: SeedGame[] = [
  { title: "Borderlands 4", platform: "PS5" },
  { title: "Cronos: The New Dawn", platform: "PS5" },
  { title: "Demon's Souls", platform: "PS5" },
  { title: "Devil May Cry 5", platform: "PS5", edition: "Special Edition" },
  { title: "Dragon Quest VII Reimagined", platform: "PS5" },
  { title: "Dying Light 2 Stay Human", platform: "PS5" },
  { title: "Elden Ring", platform: "PS5" },
  { title: "Clair Obscur: Expedition 33", platform: "PS5" },
  { title: "Final Fantasy XVI", platform: "PS5" },
  { title: "Final Fantasy VII Remake Intergrade", platform: "PS5" },
  { title: "Final Fantasy Tactics: The Ivalice Chronicles", platform: "PS5" },
  { title: "Horizon Forbidden West", platform: "PS5" },
  { title: "Horizon Zero Dawn Remastered", platform: "PS5" },
  { title: "Ghost of Tsushima", platform: "PS5", edition: "Director's Cut" },
  { title: "Ghost of Yōtei", platform: "PS5" },
  { title: "God of War Ragnarök", platform: "PS5" },
  { title: "Kena: Bridge of Spirits", platform: "PS5", edition: "Deluxe Edition" },
  { title: "Lords of the Fallen", platform: "PS5" },
  { title: "Metal Gear Solid Delta: Snake Eater", platform: "PS5" },
  { title: "Metaphor: ReFantazio", platform: "PS5" },
  { title: "Nioh Collection", platform: "PS5" },
  { title: "Nioh 3", platform: "PS5" },
  { title: "Resident Evil Requiem", platform: "PS5" },
  { title: "Silent Hill 2", platform: "PS5" },
  { title: "Stellar Blade", platform: "PS5" },
  { title: "Tactics Ogre: Reborn", platform: "PS5" },
  { title: "The Last of Us Part I", platform: "PS5" },
  { title: "The Last of Us Part II Remastered", platform: "PS5" },
  { title: "Wo Long: Fallen Dynasty", platform: "PS5" },
  { title: "A Plague Tale Collection", platform: "PS5" },
  // incluídos depois (versão 2 do catálogo)
  { title: "Castlevania: Belmont's Curse", platform: "PS5", edition: "Midnight Edition", since: 2 },
  { title: "Black Myth: Wukong", platform: "PS5", since: 2 },
  { title: "Octopath Traveler 0", platform: "PS5", since: 2 },
  { title: "Dragon Quest I & II HD-2D Remake", platform: "PS5", since: 2 },
  // versão 3 do catálogo
  { title: "The Adventures of Elliot: The Millennium Tales", platform: "PS5", since: 3 },
  { title: "Assassin's Creed Shadows", platform: "PS5", edition: "Limited Edition", since: 3 },
  { title: "Octopath Traveler II", platform: "PS5", since: 3 },
  { title: "Lies of P", platform: "PS5", since: 3 },
  // versão 4 do catálogo
  { title: "Hollow Knight", platform: "PS5", since: 4 },
  { title: "Final Fantasy Resonance", platform: "PS5", since: 4 },
];

const ps4: SeedGame[] = [
  { title: "Bloodborne", platform: "PS4", edition: "Game of the Year Edition" },
  { title: "Dark Souls Trilogy", platform: "PS4" },
  { title: "Dragon Quest XI S: Echoes of an Elusive Age", platform: "PS4", edition: "Definitive Edition" },
  { title: "Final Fantasy I-VI Collection", platform: "PS4" },
  { title: "Final Fantasy VIII Remastered", platform: "PS4" },
  { title: "Final Fantasy X/X-2 HD Remaster", platform: "PS4" },
  { title: "Final Fantasy XII The Zodiac Age", platform: "PS4" },
  { title: "God of War III Remastered", platform: "PS4" },
  { title: "God of War", platform: "PS4" },
  { title: "Immortals Fenyx Rising", platform: "PS4" },
  { title: "Mega Man Legacy Collection", platform: "PS4" },
  { title: "Mega Man Legacy Collection 2", platform: "PS4" },
  { title: "Red Dead Redemption", platform: "PS4" },
  { title: "Red Dead Redemption 2", platform: "PS4" },
  { title: "Secret of Mana", platform: "PS4" },
  { title: "Assassin's Creed The Ezio Collection", platform: "PS4" },
  { title: "Borderlands 3", platform: "PS4" },
];

const xbox: SeedGame[] = [
  { title: "Dragon Quest III HD-2D Remake", platform: "Xbox Series" },
  { title: "Final Fantasy XV", platform: "Xbox One", edition: "Special Edition" },
  { title: "Star Wars Jedi: Survivor", platform: "Xbox Series" },
  { title: "Mass Effect Legendary Edition", platform: "Xbox One" },
  { title: "Stranger of Paradise: Final Fantasy Origin", platform: "Xbox Series" },
  { title: "Warhammer 40,000: Space Marine 2", platform: "Xbox Series" },
  { title: "Tales of Arise", platform: "Xbox Series" },
  { title: "The Witcher 3: Wild Hunt", platform: "Xbox One", edition: "Game of the Year Edition" },
  { title: "Titanfall", platform: "Xbox One" },
  { title: "Crisis Core –Final Fantasy VII– Reunion", platform: "Xbox Series", edition: "Importado · região livre", since: 3 },
];

const nintendo: SeedGame[] = [
  { title: "The Legend of Zelda: Ocarina of Time", platform: "Nintendo", edition: "(confirmar plataforma)" },
];

export const SEED_GAMES: SeedGame[] = [...ps5, ...ps4, ...xbox, ...nintendo];

// Sagas/franquias dos jogos do catálogo (usado para agrupar na Coleção).
// Jogos avulsos ficam sem saga. Ao mudar este mapa, aumente SAGA_VERSION para reaplicar nos bancos existentes
// (só preenche jogos que ainda não têm saga; o que você editou no site é mantido).
export const SAGA_VERSION = 1;

export const SAGA_BY_TITLE: Record<string, string> = {
  "A Plague Tale Collection": "A Plague Tale",
  "Assassin's Creed The Ezio Collection": "Assassin's Creed",
  "Assassin's Creed Shadows": "Assassin's Creed",
  "Black Myth: Wukong": "Black Myth",
  "Borderlands 3": "Borderlands",
  "Borderlands 4": "Borderlands",
  "Castlevania: Belmont's Curse": "Castlevania",
  "Dark Souls Trilogy": "Souls",
  "Demon's Souls": "Souls",
  "Devil May Cry 5": "Devil May Cry",
  "Dragon Quest I & II HD-2D Remake": "Dragon Quest",
  "Dragon Quest III HD-2D Remake": "Dragon Quest",
  "Dragon Quest VII Reimagined": "Dragon Quest",
  "Dragon Quest XI S: Echoes of an Elusive Age": "Dragon Quest",
  "Dying Light 2 Stay Human": "Dying Light",
  "Final Fantasy I-VI Collection": "Final Fantasy",
  "Final Fantasy Tactics: The Ivalice Chronicles": "Final Fantasy",
  "Final Fantasy VII Remake Intergrade": "Final Fantasy",
  "Final Fantasy VIII Remastered": "Final Fantasy",
  "Final Fantasy X/X-2 HD Remaster": "Final Fantasy",
  "Final Fantasy XII The Zodiac Age": "Final Fantasy",
  "Final Fantasy XV": "Final Fantasy",
  "Final Fantasy XVI": "Final Fantasy",
  "Stranger of Paradise: Final Fantasy Origin": "Final Fantasy",
  "Crisis Core –Final Fantasy VII– Reunion": "Final Fantasy",
  "Final Fantasy Resonance": "Final Fantasy",
  "Hollow Knight": "Hollow Knight",
  "Ghost of Tsushima": "Ghost of Tsushima",
  "Ghost of Yōtei": "Ghost of Tsushima",
  "God of War": "God of War",
  "God of War III Remastered": "God of War",
  "God of War Ragnarök": "God of War",
  "Horizon Forbidden West": "Horizon",
  "Horizon Zero Dawn Remastered": "Horizon",
  "Lords of the Fallen": "Lords of the Fallen",
  "Mass Effect Legendary Edition": "Mass Effect",
  "Mega Man Legacy Collection": "Mega Man",
  "Mega Man Legacy Collection 2": "Mega Man",
  "Metal Gear Solid Delta: Snake Eater": "Metal Gear",
  "Nioh 3": "Nioh",
  "Nioh Collection": "Nioh",
  "Octopath Traveler 0": "Octopath Traveler",
  "Octopath Traveler II": "Octopath Traveler",
  "Red Dead Redemption": "Red Dead",
  "Red Dead Redemption 2": "Red Dead",
  "Resident Evil Requiem": "Resident Evil",
  "Secret of Mana": "Mana",
  "Silent Hill 2": "Silent Hill",
  "Star Wars Jedi: Survivor": "Star Wars Jedi",
  "Tactics Ogre: Reborn": "Ogre Battle",
  "Tales of Arise": "Tales of",
  "The Last of Us Part I": "The Last of Us",
  "The Last of Us Part II Remastered": "The Last of Us",
  "The Witcher 3: Wild Hunt": "The Witcher",
  "Titanfall": "Titanfall",
  "Warhammer 40,000: Space Marine 2": "Warhammer 40,000",
  "The Legend of Zelda: Ocarina of Time": "The Legend of Zelda",
};
