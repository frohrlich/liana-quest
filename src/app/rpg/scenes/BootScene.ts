import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'BootScene',
    });
  }

  init(params: any): void {}

  preload(): void {
    // map tiles
    this.load.image('tiles', 'assets/map/spritesheet.png');

    // map in json format
    this.load.tilemapTiledJSON('map', 'assets/map/map.json');

    // our two characters
    this.load.spritesheet('player', 'assets/RPG_assets.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    this.load.image('dragonblue', 'assets/dragonblue.png');
    this.load.image('dragonorrange', 'assets/dragonorrange.png');
  }

  create(): void {
    this.scene.start('WorldScene');
  }

  override update(time: number): void {}
}
