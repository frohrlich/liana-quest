// this file contains the data for all available unit types in the game

export interface UnitData {
  HP: number;
  PM: number;
  PA: number;
  spells: string;
  frame: number;
  type: string;
}

export const amazon: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "deadly javelin, herbal medicine, sting",
  frame: 8,
  type: "Amazon",
};

export const renegade: UnitData = {
  HP: 120,
  PM: 4,
  PA: 6,
  spells: "punch",
  frame: 84,
  type: "Renegade",
};

export const snowman: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "sting",
  frame: 40,
  type: "Snowman",
};

export const dude: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "deadly javelin",
  frame: 0,
  type: "Dude",
};

export const princess: UnitData = {
  HP: 15,
  PM: 3,
  PA: 6,
  spells: "sting",
  frame: 4,
  type: "Princess",
};

export const unitsAvailable = [amazon, renegade, snowman, dude, princess];
