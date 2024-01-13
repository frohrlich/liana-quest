// this file contains the client-side data for all world maps in the game, including npcs present

export interface WorldData {
  npcs: NpcData[];
  mapName: string;
}

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
  responseDestination: string;
  quitText: string;
}

// __________ NPCS ___________

const olivia_forest: NpcData = {
  indX: 54,
  indY: 5,
  frame: 3,
  name: "Olivia",
  imageKey: "princess",
  dialog: {
    dialogText: "Hi. Do you want to enter the dark dungeon ?",
    responseText: "Yes, I do, even though it is dark.",
    responseDestination: "dungeon",
    quitText: "No, it is too dark for me.",
  },
};

const olivia_dungeon: NpcData = {
  indX: 54,
  indY: 5,
  frame: 3,
  name: "Olivia",
  imageKey: "princess",
  dialog: {
    dialogText: "Do you want to go back to the forest ?",
    responseText: "Yes, it is too dark here.",
    responseDestination: "forest",
    quitText: "No, I will embrace the darkness and go further.",
  },
};

// __________ WORLD MAPS ___________

const forest_1: WorldData = {
  npcs: [olivia_forest],
  mapName: "forest",
};

const dungeon_1: WorldData = {
  npcs: [olivia_dungeon],
  mapName: "dungeon",
};

const availableWorldMaps = [forest_1, dungeon_1];

export const findWorldMapByName = (name: string) => {
  return availableWorldMaps.find((worldMap) => worldMap.mapName === name);
};
