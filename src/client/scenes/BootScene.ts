import Phaser from "phaser";
import { io, Socket } from "socket.io-client";

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
      "battlemap4",
      "public/assets/map/battlemap4.json"
    );
    // this.load.tilemapTiledJSON("battlemap1", "public/assets/map/battleMap1.json");
    // this.load.tilemapTiledJSON("battlemap2", "public/assets/map/battleMap2.json");
    // this.load.tilemapTiledJSON("battlemap3", "public/assets/map/battleMap3.json");

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
  }

  create(): void {
    this.scene.start("WorldScene");
  }
}
