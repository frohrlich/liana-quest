import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene",
    });
  }

  init(params: any): void {}

  preload(): void {
    // map tiles
    this.load.image("tiles", "assets/map/spritesheet.png");

    // map in json format
    this.load.tilemapTiledJSON("map", "assets/map/map.json");
    this.load.tilemapTiledJSON("battlemap1", "assets/map/battleMap1.json");
    this.load.tilemapTiledJSON("battlemap2", "assets/map/battleMap2.json");
    this.load.tilemapTiledJSON("battlemap3", "assets/map/battleMap3.json");

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

    // illustration image
    this.load.image("guerriere", "assets/guerriere.png");
  }

  create(): void {
    // this.scene.start("BattleScene");
    this.scene.start("WorldScene");
  }

  override update(time: number): void {}
}
