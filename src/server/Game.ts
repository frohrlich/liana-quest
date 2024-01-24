import { ServerWorldScene } from "./scenes/ServerWorldScene";
import { availableServerWorldMaps } from "./data/ServerWorldData";
import { Server } from "socket.io";

export class Game {
  serverWorldScenes: ServerWorldScene[] = [];
  io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  start() {
    // get world maps info and create actual world scene instances from it
    availableServerWorldMaps.forEach((worldMapData) => {
      this.serverWorldScenes.push(new ServerWorldScene(this, worldMapData));
    });
    // on connection, add player to first world scene of the array (our starter scene)
    this.io.on("connection", (socket) => {
      const randomColor = Math.floor(Math.random() * 16777215);
      this.serverWorldScenes[0].addNewPlayerToScene(
        socket,
        randomColor,
        "Amazon"
      );
    });
  }

  findServerWorldSceneByName = (name: string) => {
    return this.serverWorldScenes.find(
      (worldScene) => worldScene.mapName === name
    );
  };
}
