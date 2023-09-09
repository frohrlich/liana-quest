import Phaser from 'phaser';
import { MenuItem } from './MenuItem';

export class Unit extends Phaser.GameObjects.Sprite {
  maxHp: number;
  hp: number;
  damage: number;
  living: boolean;
  menuItem: MenuItem | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number | undefined,
    type: string,
    hp: number,
    damage: number
  ) {
    super(scene, x, y, texture, frame);
    this.type = type;
    this.maxHp = this.hp = hp;
    this.damage = damage; // default damage
    this.living = true;
    this.menuItem = null;
  }

  attack(target: Unit) {
    if (target.living) {
      target.takeDamage(this.damage);
      this.scene.events.emit(
        'Message',
        this.type +
          ' attacks ' +
          target.type +
          ' for ' +
          this.damage +
          ' damage'
      );
    }
  }

  takeDamage(damage: number): void {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.menuItem!.unitKilled();
      this.living = false;
      this.visible = false;
      this.menuItem = null;
    }
  }

  // we will use this to notify the menu item when the unit is dead
  setMenuItem(item: MenuItem) {
    this.menuItem = item;
  }
}
