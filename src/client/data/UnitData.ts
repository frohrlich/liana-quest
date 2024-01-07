// this file contains the data for all available unit types in the game

export interface UnitData {
  HP: number;
  PM: number;
  PA: number;
  spells: string;
  frame: number;
  name: string;
}

export const amazon: UnitData = {
  HP: 100,
  PM: 12,
  PA: 100,
  spells: "deadly javelin, herbal medicine, sting",
  frame: 6,
  name: "Amazon",
};

export const snowman: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "deadly javelin",
  frame: 30,
  name: "Snowman",
};

export const dude: UnitData = {
  HP: 100,
  PM: 6,
  PA: 6,
  spells: "deadly javelin, sting, punch",
  frame: 0,
  name: "Dude",
};

export const princess: UnitData = {
  HP: 50,
  PM: 3,
  PA: 6,
  spells: "deadly javelin",
  frame: 3,
  name: "Princess",
};

export const unitsAvailable = [amazon, snowman, dude, princess];
