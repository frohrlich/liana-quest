import Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import { npcsAvailable } from "../data/NpcData";

export class BootScene extends Phaser.Scene {
  socket: any;
  constructor() {
    super({
      key: "BootScene",
    });
  }

  preload(): void {
    // map tiles
    this.load.image("tiles", "public/assets/map/spritesheet.png");

    // maps in json format
    this.load.tilemapTiledJSON("map", "public/assets/map/map.json");

    this.load.tilemapTiledJSON(
      "battlemap1",
      "public/assets/map/battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "battlemap2",
      "public/assets/map/battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "battlemap3",
      "public/assets/map/battlemap3.json"
    );

    // characters
    this.load.spritesheet("player", "public/assets/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // fonts
    this.load.bitmapFont(
      "dogicapixel",
      "public/assets/fonts/dogicapixel.png",
      "public/assets/fonts/dogicapixel.xml"
    );
    this.load.bitmapFont(
      "dogicapixelbold",
      "public/assets/fonts/dogicapixelbold.png",
      "public/assets/fonts/dogicapixelbold.xml"
    );
  }

  create(): void {
    this.scene.start("WorldScene", { npcs: npcsAvailable });
  }
}
