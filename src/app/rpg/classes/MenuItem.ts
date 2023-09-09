import Phaser from 'phaser';

export class MenuItem extends Phaser.GameObjects.Text {
  constructor(x: number, y: number, text: string, scene: Phaser.Scene) {
    super(scene, x, y, text, { color: '#ffffff', align: 'left', fontSize: 15 });
  }

  select() {
    this.setColor('#f8ff38');
  }

  deselect() {
    this.setColor('#ffffff');
  }

  // when the associated enemy or player unit is killed
  unitKilled() {
    this.active = false;
    this.visible = false;
  }
}
