// this file contains the data for all available unit types in the game

export interface UnitData {
  HP: number;
  PM: number;
  PA: number;
  spells: string;
  frame: number;
  type: string;
  description: string;
}

export const amazon: UnitData = {
  HP: 100,
  PM: 5,
  PA: 6,
  spells: "Deadly javelin, Herbal medicine, Sting",
  frame: 8,
  type: "Amazon",
  description: "A fearsome warrior. Always angry about something.",
};

export const renegade: UnitData = {
  HP: 120,
  PM: 4,
  PA: 6,
  spells: "Weighted net, Trident, Punch",
  frame: 84,
  type: "Renegade",
  description: "In his dreams, he's still in the Colosseum.",
};

export const stranger: UnitData = {
  HP: 80,
  PM: 4,
  PA: 6,
  spells: "Stargazing, Revelation, Plague",
  frame: 88,
  type: "Stranger",
  description: "...",
};

export const snowman: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "Sting",
  frame: 40,
  type: "Snowman",
  description: "Snow !",
};

export const dude: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "Deadly javelin",
  frame: 0,
  type: "Dude",
  description: "Just some dude.",
};

export const princess: UnitData = {
  HP: 15,
  PM: 3,
  PA: 6,
  spells: "Sting",
  frame: 4,
  type: "Princess",
  description: "A typical princess.",
};

const availableUnits = [amazon, renegade, stranger, snowman, dude, princess];

export const findUnitDataByType = (type: string) => {
  return availableUnits.find((unitData) => unitData.type === type);
};
