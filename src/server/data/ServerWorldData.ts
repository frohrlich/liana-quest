// represents the data pertaining to a world map, server-side
// i.e. how many enemies are there, the tilemap name, etc

import { Position } from "../scenes/ServerWorldScene";

export interface ServerWorldData {
  enemyCount: number;
  enemyType: string;
  enemyMinPosition: number;
  enemyMaxPosition: number;
  playerStarterPosition: Position;
  mapName: string;
}

const forest_1: ServerWorldData = {
  enemyCount: 15,
  enemyType: "Dude",
  enemyMinPosition: 5,
  enemyMaxPosition: 99,
  playerStarterPosition: { indX: 55, indY: 2 },
  mapName: "forest",
};

const dungeon_1: ServerWorldData = {
  enemyCount: 3,
  enemyType: "Snowman",
  enemyMinPosition: 0,
  enemyMaxPosition: 99,
  playerStarterPosition: { indX: 55, indY: 5 },
  mapName: "dungeon",
};

export const availableServerWorldMaps = [forest_1, dungeon_1];

export const findServerWorldMapByName = (name: string) => {
  return availableServerWorldMaps.find((worldMap) => worldMap.mapName === name);
};
