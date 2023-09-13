import Phaser from 'phaser';
import { Unit } from './Unit';
import { BattleScene } from '../scenes/BattleScene';

export class Player extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number
  ) {
    super(scene, x, y, texture, frame, indX, indY, maxPm);
  }

  override nextAction(): void {
    let myScene = this.scene as BattleScene;
    myScene.clearAccessibleTiles();
    myScene.highlightAccessibleTiles(myScene.accessibleTiles);
  }
}
