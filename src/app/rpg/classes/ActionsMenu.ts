import Phaser from 'phaser';
import { Menu } from './Menu';

export class ActionsMenu extends Menu {
  constructor(x: number, y: number, scene: Phaser.Scene) {
    super(x, y, scene);
    this.addMenuItem('Attack');
  }

  override confirm() {
    this.scene.events.emit('SelectedAction');
  }
}
