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
    this.load.image("tiles", "assets/map/spritesheet.png");

    // maps in json format
    this.load.tilemapTiledJSON("map", "assets/map/map.json");
    this.load.tilemapTiledJSON("battlemap1", "assets/map/battleMap1.json");
    this.load.tilemapTiledJSON("battlemap2", "assets/map/battleMap2.json");
    this.load.tilemapTiledJSON("battlemap3", "assets/map/battleMap3.json");
    this.load.tilemapTiledJSON("battlemap4", "assets/map/battleMap4.json"); //

    // characters
    this.load.spritesheet("player", "assets/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // fonts
    this.load.bitmapFont(
      "rainyhearts",
      "assets/fonts/rainyhearts.png",
      "assets/fonts/rainyhearts.xml"
    );
  }

  create(): void {
    this.scene.start("WorldScene");
  }
}
