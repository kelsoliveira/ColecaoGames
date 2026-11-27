import { normalizeTitle } from "./format";

// Jogos principais de cada saga presente na coleção (numerados, mais remakes/remasters relevantes),
// usados para mostrar o que falta na coleção. Não é uma lista exaustiva de derivados.
//
// - title: nome de referência do jogo.
// - aliases: títulos de produtos da coleção que "contam" como este jogo (remakes, remasters, coletâneas).
// - platforms: onde foi lançado (originais e relançamentos principais). Ao adicionar, você escolhe a plataforma.
// - note: observação curta (ex.: em qual coletânea está disponível hoje).
//
// Revise e complemente à vontade: a comparação usa o título normalizado (sem acentos, maiúsculas e pontuação).

export type SagaEntry = {
  title: string;
  year: number;
  platforms: string[];
  aliases?: string[];
  note?: string;
};

export const SAGA_CATALOG: Record<string, SagaEntry[]> = {
  "A Plague Tale": [
    { title: "A Plague Tale: Innocence", year: 2019, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "Switch", "PC"], aliases: ["A Plague Tale Collection"] },
    { title: "A Plague Tale: Requiem", year: 2022, platforms: ["PS5", "Xbox Series", "PC"], aliases: ["A Plague Tale Collection"] },
  ],
  "Assassin's Creed": [
    { title: "Assassin's Creed", year: 2007, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Assassin's Creed II", year: 2009, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Assassin's Creed The Ezio Collection"], note: "Na The Ezio Collection (PS4, Xbox One, Switch)" },
    { title: "Assassin's Creed Brotherhood", year: 2010, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Assassin's Creed The Ezio Collection"] },
    { title: "Assassin's Creed Revelations", year: 2011, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Assassin's Creed The Ezio Collection"] },
    { title: "Assassin's Creed III", year: 2012, platforms: ["PS3", "Xbox 360", "Wii U", "PC"], aliases: ["Assassin's Creed III Remastered"], note: "Remastered em 2019 (PS4, Xbox One, Switch, PC)" },
    { title: "Assassin's Creed IV: Black Flag", year: 2013, platforms: ["PS4", "PS3", "Xbox One", "Xbox 360", "Switch", "PC"] },
    { title: "Assassin's Creed Rogue", year: 2014, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Assassin's Creed Rogue Remastered"], note: "Remastered em 2018 (PS4, Xbox One)" },
    { title: "Assassin's Creed Unity", year: 2014, platforms: ["PS4", "Xbox One", "PC"] },
    { title: "Assassin's Creed Syndicate", year: 2015, platforms: ["PS4", "Xbox One", "PC"] },
    { title: "Assassin's Creed Origins", year: 2017, platforms: ["PS4", "Xbox One", "PC"] },
    { title: "Assassin's Creed Odyssey", year: 2018, platforms: ["PS4", "Xbox One", "PC"] },
    { title: "Assassin's Creed Valhalla", year: 2020, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Assassin's Creed Mirage", year: 2023, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Assassin's Creed Shadows", year: 2025, platforms: ["PS5", "Xbox Series", "PC"] },
  ],
  "Black Myth": [{ title: "Black Myth: Wukong", year: 2024, platforms: ["PS5", "PC"] }],
  Borderlands: [
    { title: "Borderlands", year: 2009, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Borderlands Game of the Year Edition"], note: "GOTY Enhanced em 2019 (PS4, Xbox One, Switch, PC)" },
    { title: "Borderlands 2", year: 2012, platforms: ["PS3", "Xbox 360", "PS Vita", "PC"], note: "No PS4/Xbox One na The Handsome Collection; Switch em 2020" },
    { title: "Borderlands: The Pre-Sequel", year: 2014, platforms: ["PS3", "Xbox 360", "PC"], note: "No PS4/Xbox One na The Handsome Collection" },
    { title: "Borderlands 3", year: 2019, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Borderlands 4", year: 2025, platforms: ["PS5", "Xbox Series", "Switch 2", "PC"] },
  ],
  Castlevania: [
    { title: "Castlevania", year: 1986, platforms: ["NES"], note: "Na Castlevania Anniversary Collection (PS4, Xbox One, Switch, PC)" },
    { title: "Castlevania II: Simon's Quest", year: 1987, platforms: ["NES"], note: "Na Anniversary Collection" },
    { title: "Castlevania III: Dracula's Curse", year: 1989, platforms: ["NES"], note: "Na Anniversary Collection" },
    { title: "Super Castlevania IV", year: 1991, platforms: ["SNES"], note: "Na Anniversary Collection" },
    { title: "Castlevania: Rondo of Blood", year: 1993, platforms: ["Outro"], note: "PC Engine; no PS4 em Castlevania Requiem" },
    { title: "Castlevania: Symphony of the Night", year: 1997, platforms: ["PS1", "Xbox 360"], note: "No PS4 em Castlevania Requiem" },
    { title: "Castlevania: Aria of Sorrow", year: 2003, platforms: ["Game Boy"], note: "GBA; na Castlevania Advance Collection (PS4, Xbox One, Switch, PC)" },
    { title: "Castlevania: Dawn of Sorrow", year: 2005, platforms: ["DS"], note: "Na Castlevania Dominus Collection (PS4, Xbox One, Switch, PC)" },
    { title: "Castlevania: Portrait of Ruin", year: 2006, platforms: ["DS"], note: "Na Dominus Collection" },
    { title: "Castlevania: Order of Ecclesia", year: 2008, platforms: ["DS"], note: "Na Dominus Collection" },
    { title: "Castlevania: Lords of Shadow", year: 2010, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Castlevania: Lords of Shadow 2", year: 2014, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Castlevania: Belmont's Curse", year: 2026, platforms: ["PS5", "Xbox Series", "Switch 2", "PC"] },
  ],
  "Devil May Cry": [
    { title: "Devil May Cry", year: 2001, platforms: ["PS2"], aliases: ["Devil May Cry HD Collection"], note: "Na HD Collection (PS4, Xbox One, PC) e no Switch" },
    { title: "Devil May Cry 2", year: 2003, platforms: ["PS2"], aliases: ["Devil May Cry HD Collection"] },
    { title: "Devil May Cry 3", year: 2005, platforms: ["PS2"], aliases: ["Devil May Cry HD Collection", "Devil May Cry 3 Special Edition"] },
    { title: "Devil May Cry 4", year: 2008, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Devil May Cry 4 Special Edition"], note: "Special Edition em 2015 (PS4, Xbox One, PC)" },
    { title: "DmC: Devil May Cry", year: 2013, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["DmC Devil May Cry: Definitive Edition"], note: "Definitive Edition em 2015 (PS4, Xbox One)" },
    { title: "Devil May Cry 5", year: 2019, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
  ],
  "Dragon Quest": [
    { title: "Dragon Quest", year: 1986, platforms: ["NES"], aliases: ["Dragon Quest I & II HD-2D Remake"] },
    { title: "Dragon Quest II", year: 1987, platforms: ["NES"], aliases: ["Dragon Quest I & II HD-2D Remake"] },
    { title: "Dragon Quest III", year: 1988, platforms: ["NES"], aliases: ["Dragon Quest III HD-2D Remake"] },
    { title: "Dragon Quest IV", year: 1990, platforms: ["NES", "DS"], note: "Remake no DS (2008) e celular" },
    { title: "Dragon Quest V", year: 1992, platforms: ["SNES", "PS2", "DS"], note: "Remake no DS (2008) e celular" },
    { title: "Dragon Quest VI", year: 1995, platforms: ["SNES", "DS"], note: "Remake no DS (2010) e celular" },
    { title: "Dragon Quest VII", year: 2000, platforms: ["PS1", "3DS"], aliases: ["Dragon Quest VII Reimagined"] },
    { title: "Dragon Quest VIII", year: 2004, platforms: ["PS2", "3DS"] },
    { title: "Dragon Quest IX", year: 2009, platforms: ["DS"] },
    { title: "Dragon Quest X", year: 2012, platforms: ["Outro"], note: "Online; lançado oficialmente só no Japão" },
    { title: "Dragon Quest XI", year: 2017, platforms: ["PS4", "Xbox One", "Switch", "PC"], aliases: ["Dragon Quest XI S: Echoes of an Elusive Age"] },
  ],
  "Dying Light": [
    { title: "Dying Light", year: 2015, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "Switch", "PC"] },
    { title: "Dying Light 2 Stay Human", year: 2022, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Dying Light: The Beast", year: 2025, platforms: ["PS5", "Xbox Series", "PC"] },
  ],
  "Final Fantasy": [
    { title: "Final Fantasy", year: 1987, platforms: ["NES"], aliases: ["Final Fantasy I-VI Collection"], note: "Pixel Remaster" },
    { title: "Final Fantasy II", year: 1988, platforms: ["NES"], aliases: ["Final Fantasy I-VI Collection"] },
    { title: "Final Fantasy III", year: 1990, platforms: ["NES", "DS"], aliases: ["Final Fantasy I-VI Collection"] },
    { title: "Final Fantasy IV", year: 1991, platforms: ["SNES", "DS"], aliases: ["Final Fantasy I-VI Collection"] },
    { title: "Final Fantasy V", year: 1992, platforms: ["SNES"], aliases: ["Final Fantasy I-VI Collection"] },
    { title: "Final Fantasy VI", year: 1994, platforms: ["SNES"], aliases: ["Final Fantasy I-VI Collection"] },
    { title: "Final Fantasy VII", year: 1997, platforms: ["PS1", "PS4", "Xbox One", "Switch", "PC"], note: "O original; o Remake é outro jogo" },
    { title: "Final Fantasy VIII", year: 1999, platforms: ["PS1", "PC"], aliases: ["Final Fantasy VIII Remastered"] },
    { title: "Final Fantasy IX", year: 2000, platforms: ["PS1", "PS4", "Xbox One", "Switch", "PC"] },
    { title: "Final Fantasy X", year: 2001, platforms: ["PS2"], aliases: ["Final Fantasy X/X-2 HD Remaster"] },
    { title: "Final Fantasy X-2", year: 2003, platforms: ["PS2"], aliases: ["Final Fantasy X/X-2 HD Remaster"] },
    { title: "Final Fantasy XII", year: 2006, platforms: ["PS2"], aliases: ["Final Fantasy XII The Zodiac Age"] },
    { title: "Final Fantasy XIII", year: 2009, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Final Fantasy XIII-2", year: 2011, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Lightning Returns: Final Fantasy XIII", year: 2013, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Final Fantasy XIV", year: 2010, platforms: ["PS5", "PS4", "Xbox Series", "PC"], note: "Online (A Realm Reborn, 2013)" },
    { title: "Final Fantasy XV", year: 2016, platforms: ["PS4", "Xbox One", "PC"] },
    { title: "Final Fantasy XVI", year: 2023, platforms: ["PS5", "PC"] },
    { title: "Final Fantasy VII Remake", year: 2020, platforms: ["PS5", "PS4", "PC"], aliases: ["Final Fantasy VII Remake Intergrade"] },
    { title: "Final Fantasy VII Rebirth", year: 2024, platforms: ["PS5", "PC"] },
    { title: "Final Fantasy Tactics", year: 1997, platforms: ["PS1", "PSP"], aliases: ["Final Fantasy Tactics: The Ivalice Chronicles"] },
    { title: "Final Fantasy Resonance", year: 2026, platforms: ["PS5"], note: "Primeiro Final Fantasy em HD-2D" },
  ],
  "Hollow Knight": [
    { title: "Hollow Knight", year: 2017, platforms: ["PS5", "PS4", "Xbox One", "Switch 2", "Switch", "PC"], note: "Edição física de PS5 pela Fangamer (2026)" },
    { title: "Hollow Knight: Silksong", year: 2025, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "Switch 2", "Switch", "PC"] },
  ],
  "Ghost of Tsushima": [
    { title: "Ghost of Tsushima", year: 2020, platforms: ["PS5", "PS4", "PC"] },
    { title: "Ghost of Yōtei", year: 2025, platforms: ["PS5"] },
  ],
  "God of War": [
    { title: "God of War (2005)", year: 2005, platforms: ["PS2", "PS3"], note: "Na God of War Collection (PS3/Vita)" },
    { title: "God of War II", year: 2007, platforms: ["PS2", "PS3"], note: "Na God of War Collection (PS3/Vita)" },
    { title: "God of War: Chains of Olympus", year: 2008, platforms: ["PSP", "PS3"], note: "Na Origins Collection (PS3)" },
    { title: "God of War III", year: 2010, platforms: ["PS3", "PS4"], aliases: ["God of War III Remastered"] },
    { title: "God of War: Ghost of Sparta", year: 2010, platforms: ["PSP", "PS3"], note: "Na Origins Collection (PS3)" },
    { title: "God of War: Ascension", year: 2013, platforms: ["PS3"] },
    { title: "God of War (2018)", year: 2018, platforms: ["PS4", "PC"], aliases: ["God of War"] },
    { title: "God of War Ragnarök", year: 2022, platforms: ["PS5", "PS4", "PC"] },
  ],
  Horizon: [
    { title: "Horizon Zero Dawn", year: 2017, platforms: ["PS5", "PS4", "PC"], aliases: ["Horizon Zero Dawn Remastered"] },
    { title: "Horizon Forbidden West", year: 2022, platforms: ["PS5", "PS4", "PC"] },
  ],
  "Lords of the Fallen": [
    { title: "Lords of the Fallen (2014)", year: 2014, platforms: ["PS4", "Xbox One", "PC"] },
    { title: "Lords of the Fallen (2023)", year: 2023, platforms: ["PS5", "Xbox Series", "PC"], aliases: ["Lords of the Fallen"] },
  ],
  "Mass Effect": [
    { title: "Mass Effect", year: 2007, platforms: ["Xbox 360", "PS3", "PC"], aliases: ["Mass Effect Legendary Edition"] },
    { title: "Mass Effect 2", year: 2010, platforms: ["Xbox 360", "PS3", "PC"], aliases: ["Mass Effect Legendary Edition"] },
    { title: "Mass Effect 3", year: 2012, platforms: ["Xbox 360", "PS3", "Wii U", "PC"], aliases: ["Mass Effect Legendary Edition"] },
    { title: "Mass Effect: Andromeda", year: 2017, platforms: ["PS4", "Xbox One", "PC"] },
  ],
  "Mega Man": [
    { title: "Mega Man", year: 1987, platforms: ["NES"], aliases: ["Mega Man Legacy Collection"] },
    { title: "Mega Man 2", year: 1988, platforms: ["NES"], aliases: ["Mega Man Legacy Collection"] },
    { title: "Mega Man 3", year: 1990, platforms: ["NES"], aliases: ["Mega Man Legacy Collection"] },
    { title: "Mega Man 4", year: 1991, platforms: ["NES"], aliases: ["Mega Man Legacy Collection"] },
    { title: "Mega Man 5", year: 1992, platforms: ["NES"], aliases: ["Mega Man Legacy Collection"] },
    { title: "Mega Man 6", year: 1993, platforms: ["NES"], aliases: ["Mega Man Legacy Collection"] },
    { title: "Mega Man 7", year: 1995, platforms: ["SNES"], aliases: ["Mega Man Legacy Collection 2"] },
    { title: "Mega Man 8", year: 1996, platforms: ["PS1"], aliases: ["Mega Man Legacy Collection 2"] },
    { title: "Mega Man 9", year: 2008, platforms: ["PS3", "Xbox 360", "Wii"], aliases: ["Mega Man Legacy Collection 2"] },
    { title: "Mega Man 10", year: 2010, platforms: ["PS3", "Xbox 360", "Wii"], aliases: ["Mega Man Legacy Collection 2"] },
    { title: "Mega Man 11", year: 2018, platforms: ["PS4", "Xbox One", "Switch", "PC"] },
  ],
  "Metal Gear": [
    { title: "Metal Gear", year: 1987, platforms: ["Outro"], note: "MSX2; na Master Collection Vol. 1 (PS5, PS4, Xbox Series, Switch, PC)" },
    { title: "Metal Gear 2: Solid Snake", year: 1990, platforms: ["Outro"], note: "MSX2; na Master Collection Vol. 1" },
    { title: "Metal Gear Solid", year: 1998, platforms: ["PS1"], note: "Na Master Collection Vol. 1" },
    { title: "Metal Gear Solid 2: Sons of Liberty", year: 2001, platforms: ["PS2", "Xbox", "PC"], note: "Na Master Collection Vol. 1" },
    { title: "Metal Gear Solid 3: Snake Eater", year: 2004, platforms: ["PS2"], aliases: ["Metal Gear Solid Delta: Snake Eater"], note: "Remake Delta em 2025" },
    { title: "Metal Gear Solid 4: Guns of the Patriots", year: 2008, platforms: ["PS3"] },
    { title: "Metal Gear Solid: Peace Walker", year: 2010, platforms: ["PSP", "PS3", "Xbox 360"] },
    { title: "Metal Gear Solid V: Ground Zeroes", year: 2014, platforms: ["PS4", "PS3", "Xbox One", "Xbox 360", "PC"] },
    { title: "Metal Gear Solid V: The Phantom Pain", year: 2015, platforms: ["PS4", "PS3", "Xbox One", "Xbox 360", "PC"] },
  ],
  Nioh: [
    { title: "Nioh", year: 2017, platforms: ["PS4", "PC"], aliases: ["Nioh Collection", "Nioh Remastered"] },
    { title: "Nioh 2", year: 2020, platforms: ["PS4", "PC"], aliases: ["Nioh Collection", "Nioh 2 Remastered"] },
    { title: "Nioh 3", year: 2026, platforms: ["PS5", "PC"] },
  ],
  "Octopath Traveler": [
    { title: "Octopath Traveler", year: 2018, platforms: ["Switch", "Xbox One", "PC"] },
    { title: "Octopath Traveler II", year: 2023, platforms: ["PS5", "PS4", "Switch", "PC"] },
    { title: "Octopath Traveler 0", year: 2025, platforms: ["PS5", "PS4", "Switch", "Switch 2", "PC"] },
  ],
  "Red Dead": [
    { title: "Red Dead Revolver", year: 2004, platforms: ["PS2", "Xbox"], note: "Relançado no PS4 (clássicos de PS2)" },
    { title: "Red Dead Redemption", year: 2010, platforms: ["PS4", "PS3", "Xbox 360", "Switch", "PC"] },
    { title: "Red Dead Redemption 2", year: 2018, platforms: ["PS4", "Xbox One", "PC"] },
  ],
  "Resident Evil": [
    { title: "Resident Evil", year: 1996, platforms: ["PS1", "GameCube"], aliases: ["Resident Evil HD Remaster"], note: "HD Remaster em 2015 (PS4, Xbox One, Switch, PC)" },
    { title: "Resident Evil 2", year: 1998, platforms: ["PS1", "PS5", "PS4", "Xbox Series", "Xbox One", "PC"], note: "Remake em 2019" },
    { title: "Resident Evil 3", year: 1999, platforms: ["PS1", "PS5", "PS4", "Xbox Series", "Xbox One", "PC"], note: "Remake em 2020" },
    { title: "Resident Evil – Code: Veronica", year: 2000, platforms: ["Outro", "PS2", "PS3", "Xbox 360"], note: "Lançado no Dreamcast" },
    { title: "Resident Evil Zero", year: 2002, platforms: ["GameCube"], aliases: ["Resident Evil 0 HD Remaster"], note: "HD Remaster em 2016 (PS4, Xbox One, Switch, PC)" },
    { title: "Resident Evil 4", year: 2005, platforms: ["GameCube", "PS2", "PS5", "PS4", "Xbox Series", "PC"], note: "Remake em 2023" },
    { title: "Resident Evil 5", year: 2009, platforms: ["PS3", "Xbox 360", "PS4", "Xbox One", "Switch", "PC"] },
    { title: "Resident Evil 6", year: 2012, platforms: ["PS3", "Xbox 360", "PS4", "Xbox One", "Switch", "PC"] },
    { title: "Resident Evil 7: Biohazard", year: 2017, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Resident Evil Village", year: 2021, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Resident Evil Requiem", year: 2026, platforms: ["PS5", "Xbox Series", "Switch 2", "PC"] },
  ],
  Mana: [
    { title: "Final Fantasy Adventure", year: 1991, platforms: ["Game Boy"], aliases: ["Adventures of Mana"], note: "Na Collection of Mana (Switch); remake Adventures of Mana (Vita)" },
    { title: "Secret of Mana", year: 1993, platforms: ["SNES", "PS4", "PS Vita", "PC"], note: "Remake 3D em 2018" },
    { title: "Trials of Mana", year: 1995, platforms: ["SNES", "PS4", "Switch", "PC"], note: "Remake 3D em 2020" },
    { title: "Legend of Mana", year: 1999, platforms: ["PS1", "PS4", "Switch", "PC"], note: "Remastered em 2021" },
    { title: "Dawn of Mana", year: 2006, platforms: ["PS2"] },
    { title: "Visions of Mana", year: 2024, platforms: ["PS5", "PS4", "Xbox Series", "PC"] },
  ],
  "Silent Hill": [
    { title: "Silent Hill", year: 1999, platforms: ["PS1"] },
    { title: "Silent Hill 2", year: 2001, platforms: ["PS2", "Xbox", "PS5", "PC"], note: "Remake em 2024" },
    { title: "Silent Hill 3", year: 2003, platforms: ["PS2", "PC"], note: "Na HD Collection (PS3, Xbox 360)" },
    { title: "Silent Hill 4: The Room", year: 2004, platforms: ["PS2", "Xbox", "PC"] },
    { title: "Silent Hill: Origins", year: 2007, platforms: ["PSP", "PS2"] },
    { title: "Silent Hill: Homecoming", year: 2008, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Silent Hill: Shattered Memories", year: 2009, platforms: ["Wii", "PS2", "PSP"] },
    { title: "Silent Hill: Downpour", year: 2012, platforms: ["PS3", "Xbox 360"] },
    { title: "Silent Hill f", year: 2025, platforms: ["PS5", "Xbox Series", "PC"] },
  ],
  "Star Wars Jedi": [
    { title: "Star Wars Jedi: Fallen Order", year: 2019, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
    { title: "Star Wars Jedi: Survivor", year: 2023, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "PC"] },
  ],
  "Ogre Battle": [
    { title: "Ogre Battle: The March of the Black Queen", year: 1993, platforms: ["SNES", "PS1"] },
    { title: "Tactics Ogre: Let Us Cling Together", year: 1995, platforms: ["SNES", "PS1", "PSP"], aliases: ["Tactics Ogre: Reborn"], note: "Reborn (2022) é a versão atual" },
    { title: "Ogre Battle 64: Person of Lordly Caliber", year: 1999, platforms: ["Nintendo 64"] },
    { title: "Tactics Ogre: The Knight of Lodis", year: 2001, platforms: ["Game Boy"], note: "GBA" },
  ],
  "Tales of": [
    { title: "Tales of Phantasia", year: 1995, platforms: ["SNES", "PS1", "Game Boy", "PSP"] },
    { title: "Tales of Destiny", year: 1997, platforms: ["PS1", "PS2"] },
    { title: "Tales of Eternia", year: 2000, platforms: ["PS1", "PSP"] },
    { title: "Tales of Symphonia", year: 2003, platforms: ["GameCube", "PS2", "PS3", "PS4", "Xbox One", "Switch", "PC"], aliases: ["Tales of Symphonia Remastered"] },
    { title: "Tales of Rebirth", year: 2004, platforms: ["PS2", "PSP"] },
    { title: "Tales of Legendia", year: 2005, platforms: ["PS2"] },
    { title: "Tales of the Abyss", year: 2005, platforms: ["PS2", "3DS"] },
    { title: "Tales of Vesperia", year: 2008, platforms: ["Xbox 360", "PS3", "PS4", "Xbox One", "Switch", "PC"], aliases: ["Tales of Vesperia: Definitive Edition"] },
    { title: "Tales of Graces", year: 2009, platforms: ["Wii", "PS3", "PS5", "PS4", "Xbox Series", "Switch", "PC"], aliases: ["Tales of Graces f", "Tales of Graces f Remastered"] },
    { title: "Tales of Xillia", year: 2011, platforms: ["PS3", "PS5", "PS4", "Xbox Series", "Switch", "PC"], aliases: ["Tales of Xillia Remastered"] },
    { title: "Tales of Xillia 2", year: 2012, platforms: ["PS3"] },
    { title: "Tales of Zestiria", year: 2015, platforms: ["PS4", "PS3", "PC"] },
    { title: "Tales of Berseria", year: 2016, platforms: ["PS4", "PS3", "PC"] },
    { title: "Tales of Arise", year: 2021, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "Switch", "PC"] },
  ],
  "The Last of Us": [
    { title: "The Last of Us Part I", year: 2013, platforms: ["PS5", "PS4", "PS3", "PC"], aliases: ["The Last of Us", "The Last of Us Remastered"], note: "Original 2013; remake Part I em 2022" },
    { title: "The Last of Us Part II", year: 2020, platforms: ["PS5", "PS4", "PC"], aliases: ["The Last of Us Part II Remastered"] },
  ],
  "The Witcher": [
    { title: "The Witcher", year: 2007, platforms: ["PC"] },
    { title: "The Witcher 2: Assassins of Kings", year: 2011, platforms: ["Xbox 360", "PC"] },
    { title: "The Witcher 3: Wild Hunt", year: 2015, platforms: ["PS5", "PS4", "Xbox Series", "Xbox One", "Switch", "PC"] },
  ],
  Titanfall: [
    { title: "Titanfall", year: 2014, platforms: ["Xbox One", "Xbox 360", "PC"] },
    { title: "Titanfall 2", year: 2016, platforms: ["PS4", "Xbox One", "PC"] },
  ],
  "Warhammer 40,000": [
    { title: "Warhammer 40,000: Space Marine", year: 2011, platforms: ["PS3", "Xbox 360", "PC"] },
    { title: "Warhammer 40,000: Space Marine 2", year: 2024, platforms: ["PS5", "Xbox Series", "PC"] },
  ],
  "The Legend of Zelda": [
    { title: "The Legend of Zelda", year: 1986, platforms: ["NES"] },
    { title: "Zelda II: The Adventure of Link", year: 1987, platforms: ["NES"] },
    { title: "The Legend of Zelda: A Link to the Past", year: 1991, platforms: ["SNES"] },
    { title: "The Legend of Zelda: Link's Awakening", year: 1993, platforms: ["Game Boy", "Switch"], note: "Remake no Switch (2019)" },
    { title: "The Legend of Zelda: Ocarina of Time", year: 1998, platforms: ["Nintendo 64", "3DS"] },
    { title: "The Legend of Zelda: Majora's Mask", year: 2000, platforms: ["Nintendo 64", "3DS"] },
    { title: "The Legend of Zelda: Oracle of Seasons", year: 2001, platforms: ["Game Boy"] },
    { title: "The Legend of Zelda: Oracle of Ages", year: 2001, platforms: ["Game Boy"] },
    { title: "The Legend of Zelda: The Wind Waker", year: 2002, platforms: ["GameCube", "Wii U"] },
    { title: "The Legend of Zelda: The Minish Cap", year: 2004, platforms: ["Game Boy"], note: "GBA" },
    { title: "The Legend of Zelda: Twilight Princess", year: 2006, platforms: ["GameCube", "Wii", "Wii U"] },
    { title: "The Legend of Zelda: Phantom Hourglass", year: 2007, platforms: ["DS"] },
    { title: "The Legend of Zelda: Spirit Tracks", year: 2009, platforms: ["DS"] },
    { title: "The Legend of Zelda: Skyward Sword", year: 2011, platforms: ["Wii", "Switch"], note: "HD no Switch (2021)" },
    { title: "The Legend of Zelda: A Link Between Worlds", year: 2013, platforms: ["3DS"] },
    { title: "The Legend of Zelda: Breath of the Wild", year: 2017, platforms: ["Switch", "Switch 2", "Wii U"] },
    { title: "The Legend of Zelda: Tears of the Kingdom", year: 2023, platforms: ["Switch", "Switch 2"] },
    { title: "The Legend of Zelda: Echoes of Wisdom", year: 2024, platforms: ["Switch"] },
  ],
  Souls: [
    { title: "Demon's Souls", year: 2009, platforms: ["PS3", "PS5"], note: "Remake no PS5 (2020)" },
    { title: "Dark Souls", year: 2011, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Dark Souls Trilogy", "Dark Souls Remastered"], note: "Remastered em 2018 (PS4, Xbox One, Switch, PC)" },
    { title: "Dark Souls II", year: 2014, platforms: ["PS3", "Xbox 360", "PC"], aliases: ["Dark Souls Trilogy", "Dark Souls II: Scholar of the First Sin"], note: "Scholar of the First Sin em 2015 (PS4, Xbox One)" },
    { title: "Dark Souls III", year: 2016, platforms: ["PS4", "Xbox One", "PC"], aliases: ["Dark Souls Trilogy"] },
  ],
};


export type SagaItem = { entry: SagaEntry; owned: { id: number; title: string }[]; wished: { id: number; title: string } | null };

/** Compara o catálogo da saga com os jogos cadastrados (possuídos e na lista de desejos). */
export function sagaProgress(
  saga: string,
  games: { id: number; title: string; status: string }[],
): { items: SagaItem[]; ownedCount: number; total: number } | null {
  const entries = SAGA_CATALOG[saga];
  if (!entries) return null;
  const byTitle = new Map<string, { id: number; title: string; status: string }[]>();
  for (const g of games) {
    const k = normalizeTitle(g.title);
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k)!.push(g);
  }
  const items = entries.map((entry) => {
    const keys = [entry.title, ...(entry.aliases ?? [])].map(normalizeTitle);
    const matches = keys.flatMap((k) => byTitle.get(k) ?? []);
    const owned = matches.filter((g) => g.status !== "desejado").map(({ id, title }) => ({ id, title }));
    const wish = matches.find((g) => g.status === "desejado");
    return { entry, owned, wished: wish ? { id: wish.id, title: wish.title } : null };
  });
  return { items, ownedCount: items.filter((i) => i.owned.length).length, total: items.length };
}
