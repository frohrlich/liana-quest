import Phaser from 'phaser';
import { Menu } from './Menu';

export class HeroesMenu extends Menu {
  constructor(x: number, y: number, scene: Phaser.Scene) {
    super(x, y, scene);
  }
}
