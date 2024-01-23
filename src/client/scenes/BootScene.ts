import Phaser from "phaser";
import { findWorldMapByName } from "../data/WorldData";

export class BootScene extends Phaser.Scene {
  socket: any;
  constructor() {
    super({
      key: "BootScene",
    });
  }

  preload(): void {
    // map tiles
    this.load.image("forest_tiles", "public/assets/map/spritesheet.png");
    this.load.image(
      "dungeon_tiles",
      "public/assets/map/dungeon_spritesheet.png"
    );

    // maps in json format
    this.load.tilemapTiledJSON(
      "forest_map",
      "public/assets/map/forest_map.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_map",
      "public/assets/map/dungeon_map.json"
    );

    this.load.tilemapTiledJSON(
      "forest_battlemap1",
      "public/assets/map/forest_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap2",
      "public/assets/map/forest_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap3",
      "public/assets/map/forest_battlemap3.json"
    );

    this.load.tilemapTiledJSON(
      "dungeon_battlemap1",
      "public/assets/map/dungeon_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_battlemap2",
      "public/assets/map/dungeon_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_battlemap3",
      "public/assets/map/dungeon_battlemap3.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap_new",
      "public/assets/map/forest_battlemap_new.json"
    );

    // characters
    this.load.spritesheet("player", "public/assets/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // illustrations
    this.load.image("princess", "public/assets/images/princess.png");

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
    this.scene.start("WorldScene", findWorldMapByName("forest"));
  }
}
