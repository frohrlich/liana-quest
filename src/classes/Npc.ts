import Phaser from "phaser";
import { Unit } from "./Unit";
import { Spell } from "./Spell";

export class Npc extends Unit {
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

  // plays npc turn
  override playTurn() {
    // first try to launch spell if there is a target available
    if (this.pa >= this.spells[0].cost) {
      let target = this.locateTarget(this.spells[0]);
      if (target) {
        let targetVec = new Phaser.Math.Vector2(target.x, target.y);
        this.castSpell(this.spells[0], targetVec);
        // wait till attack animation is finished
        this.scene.time.addEvent({
          delay: 400,
          callback: this.tryToMove,
          callbackScope: this,
        });
      } else {
        this.tryToMove();
      }
    } else {
      this.tryToMove();
    }
  }

  // attempts to find an accessible tile and move to it
  tryToMove() {
    if (this.pm > 0) {
      const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
      // first calculate the accessible tiles around npc
      let accessibleTiles = this.myScene.calculateAccessibleTiles(
        startVec,
        this.pm
      );
      // then chooses one randomly
      const randMove = Phaser.Math.Between(0, accessibleTiles.length - 1);
      let targetVec = accessibleTiles[randMove];
      // then finds the path to it
      let path = this.myScene.findPath(startVec, targetVec);
      if (path) {
        // then move along it
        this.moveAlong(path);
      } else {
        // if no path found, do nothing
        this.stopMovement();
      }
    } else {
      this.stopMovement();
    }
  }

  override nextAction() {
    this.endTurn();
  }

  endTurn() {
    this.timelineSlot.tint = 0xffffff;
    this.refillPoints();
    this.myScene.endTurn();
  }

  // locates an accessible target for a given spell
  locateTarget(spell: Spell) {
    return this.myScene.background?.findTile(
      (tile) =>
        // if there is a unit there, and it's an enemy, and there is a line of sight
        // then it's a valid target
        this.myScene.isUnitThere(tile.x, tile.y) &&
        this.isEnemy(this.myScene.getUnitAtPos(tile.x, tile.y)!) &&
        this.myScene.isVisible(this, spell, tile)
    );
  }

  // return true if the given unit is a foe for this npc
  isEnemy(unit: Unit) {
    return this.isAlly ? !unit.isAlly : unit.isAlly;
  }
}
