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
  3,
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
  4
);

export const punch = new Spell(51, 1, 1, 2, "Punch", true, false, 55);

export const sting = new Spell(
  60,
  0,
  30,
  2,
  "Sting",
  false,
  false,
  0,
  1,
  1,
  0,
  1,
  0,
  "monoTarget",
  0,
  0,
  poison
);

export const heal = new Spell(
  69,
  0,
  8,
  3,
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
  2,
  0,
  null,
  princess
);
