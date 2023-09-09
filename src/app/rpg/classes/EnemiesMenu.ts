import Phaser from 'phaser';
import { Menu } from './Menu';

export class EnemiesMenu extends Menu {
  constructor(x: number, y: number, scene: Phaser.Scene) {
    super(x, y, scene);
  }

  override confirm() {
    this.scene.events.emit('Enemy', this.menuItemIndex);
  }
}
