// this file contains the data for all friendly npcs in the game

export interface NpcData {
  indX: number;
  indY: number;
  frame: number;
  name: string;
  dialog: DialogData;
}

export interface DialogData {
  dialogText: string;
  responseText: string;
}

export const princess_forest_1: NpcData = {
  indX: 1,
  indY: 6,
  frame: 3,
  name: "Olivia",
  dialog: {
    dialogText: "Hi. Do you want to enter the dark dungeon ?",
    responseText: "Yes, I do, even though it is dark.",
  },
};

export const npcsAvailable = [princess_forest_1];
