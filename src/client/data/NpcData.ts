// this file contains the data for all friendly npcs in the game

export interface NpcData {
  indX: number;
  indY: number;
  frame: number;
  name: string;
  imageKey: string;
  dialog: DialogData;
}

export interface DialogData {
  dialogText: string;
  responseText: string;
  quitText: string;
}

export const princess_forest_1: NpcData = {
  indX: 1,
  indY: 6,
  frame: 3,
  name: "Olivia",
  imageKey: "princess",
  dialog: {
    dialogText: "Hi. Do you want to enter the dark dungeon ?",
    responseText: "Yes, I do, even though it is dark.",
    quitText: "No, it is too dark for me.",
  },
};

export const npcsAvailable = [princess_forest_1];
