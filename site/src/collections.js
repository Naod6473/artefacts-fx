// Les collections : des packs d'effets choisis à la main, à télécharger d'un coup (code ou Godot 4).
// Un effet est désigné par son chemin (effets/<chemin>.js) ; un chemin qui n'existe plus est ignoré.
export const COLLECTIONS = [
  {
    id: "bestiaire",
    nom: { fr: "Bestiaire vu de dessus", en: "Top-down bestiary" },
    desc: { fr: "Toutes les créatures vues de dessus : boss rampants, poissons, nuées.", en: "Every top-down creature: crawling bosses, fish, flocks and swarms." },
    effets: ["creatures/giant-spider", "creatures/giant-centipede", "creatures/harvestman", "creatures/swelling-tick", "creatures/crab", "creatures/hydra", "creatures/octopus", "creatures/woodlouse", "creatures/mantis", "creatures/scorpion", "creatures/jellyfish-bloom", "creatures/ant-queen", "creatures/wolf-spider", "creatures/giant-python", "creatures/vampire-bat", "creatures/crow-flock", "creatures/locust-swarm", "creatures/koi", "creatures/koi-pond", "creatures/manta-ray", "creatures/sea-turtle", "creatures/shark"],
  },
  {
    id: "feu",
    nom: { fr: "Feu et explosions", en: "Fire and explosions" },
    desc: { fr: "Flammes, boules de feu et explosions de toutes tailles.", en: "Flames, fireballs and explosions of every size." },
    effets: ["fire/campfire", "fire/torch", "fire/fireball", "fire/fire-ring", "fire/flamethrower", "fire/meteor", "explosions/small-explosion", "explosions/big-explosion", "explosions/barrel-explosion", "explosions/grenade", "explosions/smoke-bomb", "explosions/nuke"],
  },
  {
    id: "combat",
    nom: { fr: "Kit de combat", en: "Combat kit" },
    desc: { fr: "Coups d'arme, impacts et parades pour un jeu d'action.", en: "Weapon swings, impacts and parries for an action game." },
    effets: ["melee/sword-slash", "melee/double-slash", "melee/spin-slash", "melee/claw-swipe", "melee/hammer-smash", "impacts/hit-flash", "impacts/hit-spark", "impacts/crit-hit", "impacts/blunt-hit", "impacts/parry", "impacts/shield-block", "impacts/ground-slam"],
  },
  {
    id: "magie",
    nom: { fr: "Grimoire du mage", en: "Wizard's spellbook" },
    desc: { fr: "Sorts d'arcane, de glace et de foudre, du lancer à l'impact.", en: "Arcane, frost and lightning spells, from cast to impact." },
    effets: ["arcane/spell-charge", "arcane/magic-circle-cast", "arcane/arcane-missiles", "arcane/mana-burst", "arcane/portal", "arcane/blink-in", "arcane/blink-out", "arcane/time-stop", "ice/ice-lance", "ice/frost-nova", "lightning/chain-lightning", "lightning/lightning-strike"],
  },
  {
    id: "cyber",
    nom: { fr: "Cyber et sci-fi", en: "Cyber and sci-fi" },
    desc: { fr: "Glitchs, hologrammes, lasers et téléportations.", en: "Glitches, holograms, lasers and teleports." },
    effets: ["scifi/glitch", "scifi/hologram", "scifi/scanner", "scifi/laser-grid", "scifi/emp-blast", "scifi/force-field", "scifi/energy-core", "scifi/warp-in", "scifi/warp-out", "scifi/teleporter-pad", "projectiles/laser-bolt", "projectiles/plasma-shot", "transitions/glitch-wipe", "transitions/crt-off"],
  },
  {
    id: "interface",
    nom: { fr: "Interface et récompenses", en: "UI and rewards" },
    desc: { fr: "Dégâts, niveaux, pièces, coffres : tout ce qui récompense le joueur.", en: "Damage numbers, level-ups, coins, chests: everything that rewards the player." },
    effets: ["ui/level-up", "ui/damage-number", "ui/crit-number", "ui/combo-counter", "ui/health-bar-hit", "ui/heart-lost", "ui/coin-collect", "ui/quest-complete", "ui/achievement", "ui/confetti", "pickups/chest-open", "pickups/xp-orb", "pickups/loot-beam"],
  },
  {
    id: "etats",
    nom: { fr: "États : bonus et malus", en: "Status: buffs and debuffs" },
    desc: { fr: "Poison, gel, étourdissement, rage… à poser sur un personnage.", en: "Poison, freeze, stun, rage… to put on a character." },
    effets: ["status/bleeding", "status/burning", "status/charmed", "status/confused", "status/cursed", "status/frozen", "status/haste", "status/petrified", "status/poisoned", "status/rage", "status/sleep", "status/slowed", "status/stunned"],
  },
  {
    id: "ambiance",
    nom: { fr: "Ambiance et météo", en: "Mood and weather" },
    desc: { fr: "Pluie, neige, brume et lucioles pour habiller un décor.", en: "Rain, snow, fog and fireflies to dress a scene." },
    effets: ["weather/rain", "weather/snow", "weather/fog", "weather/storm", "weather/fireflies", "weather/falling-leaves", "weather/cherry-blossoms", "weather/god-rays", "weather/aurora", "weather/clouds", "weather/shooting-stars"],
  },
  {
    id: "transitions",
    nom: { fr: "Transitions d'écran", en: "Screen transitions" },
    desc: { fr: "Pour passer d'un niveau ou d'un menu à l'autre.", en: "To move between levels and menus." },
    effets: ["transitions/blinds", "transitions/burn-away", "transitions/crt-off", "transitions/diamond-wipe", "transitions/glitch-wipe", "transitions/iris", "transitions/pixel-dissolve", "transitions/shatter-wipe", "transitions/slash-wipe", "transitions/star-iris"],
  },
];
