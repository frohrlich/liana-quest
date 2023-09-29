import Phaser from "phaser";
import { Unit } from "./Unit";
import { Spell } from "./Spell";

export class Player extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    isAlly: boolean
  ) {
    super(scene, x, y, texture, frame, indX, indY, maxPm, maxPa, maxHp, isAlly);
  }

  // plays at the end of deplacement
  override nextAction(): void {
    this.myScene.clearAccessibleTiles();
    this.myScene.highlightAccessibleTiles(this.myScene.accessibleTiles);
  }

  override launchSpell(spell: Spell, targetVec: Phaser.Math.Vector2): void {
    super.launchSpell(spell, targetVec);
    // if not enough pa to launch the spell again : quit spell mode
    if (this.pa < spell.cost) {
      this.myScene.clearSpellRange();
    }
  }
}
