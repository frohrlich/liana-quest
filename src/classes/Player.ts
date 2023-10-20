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
    this.myScene.refreshAccessibleTiles();
    this.myScene.highlightAccessibleTiles(this.myScene.accessibleTiles);
  }

  override endTurn(): void {
    const scene = this.myScene;
    scene.clearAccessibleTiles();
    scene.clearOverlay();
    scene.clearAoeZone();
    scene.clearPointerEvents();
    scene.spellVisible = false;
    super.endTurn();
  }

  override castSpell(spell: Spell, targetVec: Phaser.Math.Vector2): void {
    super.castSpell(spell, targetVec);
    // if spell not available anymore : quit spell mode
    if (this.pa < spell.cost || spell.cooldown > 0) {
      this.myScene.clearSpellRange();
    }
  }
}
