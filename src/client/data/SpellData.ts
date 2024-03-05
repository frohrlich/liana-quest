import { EffectOverTime } from "../classes/battle/EffectOverTime";
import { Spell } from "../classes/battle/Spell";
import { princess } from "./UnitData";

// this file contains the data for all available spells in the game

// create effects over time
const poison = new EffectOverTime("Poison", 58, 2, 10, 1, 1, 0, 0, 0);
const plagueEot = new EffectOverTime("Plague", 59, 2, 25, 2, 2, 0, 0, 0);

// create spells
const javelin = new Spell(
  56,
  1,
  5,
  4,
  "Deadly javelin",
  true,
  true,
  25,
  0,
  2,
  0,
  0,
  0,
  "line",
  3,
  0,
  poison,
  null,
  3
);

const net = new Spell(
  104,
  3,
  8,
  4,
  "Weighted net",
  true,
  false,
  15,
  2,
  0,
  0,
  0,
  0,
  "star",
  1
);

const trident = new Spell(
  116,
  2,
  3,
  2,
  "Trident",
  true,
  true,
  20,
  0,
  0,
  0,
  0,
  0,
  "line",
  1,
  1,
  null,
  null,
  -2
);

const stargazing = new Spell(
  128,
  0,
  0,
  0,
  "Stargazing",
  true,
  false,
  0,
  0,
  0,
  0,
  3,
  3,
  "monoTarget",
  0,
  2
);

const revelation = new Spell(
  140,
  0,
  6,
  4,
  "Revelation",
  false,
  false,
  0,
  4,
  4,
  25,
  0,
  0,
  "monoTarget",
  0,
  1
);

const plague = new Spell(
  152,
  0,
  5,
  3,
  "Plague",
  true,
  false,
  0,
  0,
  0,
  0,
  0,
  0,
  "monoTarget",
  0,
  0,
  plagueEot,
  null,
  0
);

const punch = new Spell(68, 1, 1, 4, "Punch", true, false, 50);

// DEV
// const sting = new Spell(
//   80,
//   0,
//   30,
//   0,
//   "Sting",
//   false,
//   false,
//   100,
//   0,
//   1,
//   0,
//   0,
//   0,
//   "monoTarget",
//   0,
//   0,
//   null
// );

// PROD
const sting = new Spell(
  80,
  0,
  12,
  2,
  "Sting",
  true,
  false,
  15,
  0,
  1,
  0,
  0,
  0,
  "monoTarget",
  0,
  1
);

const heal = new Spell(
  92,
  0,
  4,
  4,
  "Herbal medicine",
  true,
  false,
  0,
  0,
  0,
  20,
  1,
  1,
  "star",
  2
);

const availableSpells = [
  javelin,
  net,
  trident,
  stargazing,
  revelation,
  plague,
  punch,
  sting,
  heal,
];

/** Transforms a list of spell names in a string into an array of Spell objects. */
export const decodeSpellString = (spellStr: string) => {
  let spellArray: Spell[] = [];
  spellStr.split(", ").forEach((spellName) => {
    spellArray.push(availableSpells.find((spell) => spell.name === spellName));
  });
  return spellArray;
};
