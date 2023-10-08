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
    this.load.tilemapTiledJSON("battlemap", "assets/map/battleMap.json");

    // our characters
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
    this.scene.start("BattleScene");
  }

  override update(time: number): void {}
}
