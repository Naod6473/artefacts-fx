// Les tags dans la langue du visiteur. Les effets portent des tags en anglais ; on traduit les plus courants,
// les autres restent en anglais. La recherche trouve un effet par le tag dans les deux langues.

export const CATEGORIES_FR = { fire: "feu", explosions: "explosion", water: "eau", ice: "glace", lightning: "foudre", scifi: "sci-fi", melee: "mêlée", impacts: "impact", projectiles: "projectile", spawn: "apparition", arcane: "arcane", holy: "sacré", shadow: "ombre", status: "état", nature: "nature", weather: "météo", ui: "interface", pickups: "ramassage", transitions: "transition", critters: "bestiole", creatures: "créature", communaute: "communauté" };

export const TAGS_FR = {
  "one-shot": "une-fois", loop: "boucle", ground: "au-sol", directional: "directionnel", magic: "magie", fire: "feu", ambient: "ambiance",
  impact: "impact", status: "état", combat: "combat", light: "lumière", smoke: "fumée", projectile: "projectile", nature: "nature",
  pickup: "ramassage", arcane: "arcane", water: "eau", weather: "météo", ui: "interface", melee: "mêlée", shadow: "ombre",
  electric: "électrique", ice: "glace", lightning: "foudre", scifi: "sci-fi", "sci-fi": "sci-fi", spawn: "apparition", debuff: "malus",
  critter: "bestiole", screen: "plein-écran", aoe: "zone", spell: "sort", explosion: "explosion", holy: "sacré", transition: "transition",
  prop: "décor", hit: "coup", dark: "sombre", wipe: "volet", debris: "débris", text: "texte", energy: "énergie", beam: "rayon",
  death: "mort", buff: "bonus", dust: "poussière", wind: "vent", actor: "sur-personnage", slash: "entaille", reward: "récompense",
  sky: "ciel", orb: "orbe", teleport: "téléport", flash: "flash", character: "personnage", night: "nuit", sparks: "étincelles",
  ghost: "fantôme", burst: "éclat", plasma: "plasma", rain: "pluie", shatter: "brisure", storm: "orage", gun: "arme-à-feu",
  damage: "dégâts", glow: "lueur", poison: "poison", flying: "volant", nova: "nova", vortex: "vortex", spirit: "esprit", comic: "cartoon",
  earth: "terre", sparkle: "scintillement", rocket: "roquette", cloud: "nuage", drop: "goutte", float: "flottant", snow: "neige",
  freeze: "gel", shockwave: "onde-de-choc", glitch: "glitch", hud: "hud", sword: "épée", missile: "missile", gold: "or", circle: "cercle",
  rune: "rune", heal: "soin", plant: "plante", creature: "créature", boss: "boss", walk: "marche", swim: "nage", "top-down": "vue-de-dessus",
  spider: "araignée", koi: "koï", pond: "bassin", sea: "mer", insect: "insecte", bug: "insecte",
  snake: "serpent", reptile: "reptile", slither: "reptation", bat: "chauve-souris", bird: "oiseau", crow: "corbeau", flock: "nuée", swarm: "essaim",
};

// mots français courants vers l'anglais, pour chercher dans les noms et descriptions (en anglais)
export const SYNONYMES = {
  eclair: "lightning", foudre: "lightning", feu: "fire", flamme: "flame", glace: "ice", eau: "water", soin: "heal", entaille: "slash",
  epee: "sword", fumee: "smoke", pluie: "rain", neige: "snow", piece: "coin", ombre: "shadow", portail: "portal", bouclier: "shield",
  etoile: "star", orage: "storm", trou: "hole", bestiole: "critter", niveau: "level", explosion: "explosion", coffre: "chest",
  coeur: "heart", fantome: "ghost", chauve: "bat", grenouille: "frog", serpent: "snake", poisson: "fish", oiseau: "bird", papillon: "butterfly",
  crane: "skull", oeil: "eye", balle: "bullet", fleche: "arrow", fusee: "rocket", laser: "laser", torche: "torch", bougie: "candle",
  bulle: "bubble", cascade: "waterfall", vague: "wave", tornade: "tornado", seisme: "quake", racine: "root", epine: "thorn", feuille: "leaf",
  brouillard: "fog", nuage: "cloud", aurore: "aurora", luciole: "firefly", soleil: "sun", lune: "moon", rune: "rune", sort: "spell",
  malediction: "curse", ame: "soul", poison: "poison", acide: "acid", gel: "freeze", vitesse: "haste", sommeil: "sleep", confus: "confused",
  saignement: "bleed", rage: "rage", araignee: "spider", koi: "koi", carpe: "koi", requin: "shark", raie: "manta", tortue: "turtle",
  pieuvre: "octopus", poulpe: "octopus", crabe: "crab", scorpion: "scorpion", mante: "mantis", fourmi: "ant", tique: "tick", cloporte: "woodlouse",
  scolopendre: "centipede", corbeau: "crow", corneille: "crow", criquet: "locust", sauterelle: "locust", essaim: "swarm", nuee: "flock", vampire: "vampire", "mille-pattes": "centipede", hydre: "hydra", meduse: "jellyfish", opilion: "harvestman", creature: "creature", or: "gold", gemme: "gem", potion: "potion", cle: "key", tir: "shot", coup: "hit", choc: "shock",
};
