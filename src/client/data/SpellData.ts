import { EffectOverTime } from "../classes/battle/EffectOverTime";
import { Spell } from "../classes/battle/Spell";
import { princess } from "./UnitData";

// this file contains the data for all available spells in the game

// create effects over time
const poison = new EffectOverTime("Poison", 44, 2, 10, 1, 1, 0, 0, 0);

// create spells
export const javelin = new Spell(
  42,
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

export const punch = new Spell(51, 1, 1, 4, "Punch", true, false, 50);

export const sting = new Spell(
  60,
  0,
  12,
  2,
  "Sting",
  false,
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
  69,
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
