import { EffectOverTime } from "../classes/battle/EffectOverTime";
import { Spell } from "../classes/battle/Spell";
import { princess } from "./UnitData";

// this file contains the data for all available spells in the game

// create effects over time
const poison = new EffectOverTime("Poison", 58, 2, 10, 1, 1, 0, 0, 0);

// create spells
export const javelin = new Spell(
  56,
  1,
  5,
  4,
  "Deadly Javelin",
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

export const net = new Spell(
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

export const trident = new Spell(
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

export const punch = new Spell(68, 1, 1, 4, "Punch", true, false, 50);

// DEV
// export const sting = new Spell(
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
export const sting = new Spell(
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
  1,
  null
);

export const heal = new Spell(
  92,
  0,
  4,
  4,
  "Royal medicine",
  true,
  false,
  0,
  0,
  0,
  20,
  1,
  1,
  "star",
  2,
  2,
  null,
  princess
);
