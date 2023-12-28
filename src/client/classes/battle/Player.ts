import Phaser from "phaser";
import { Unit } from "./Unit";
import { Spell } from "./Spell";
import { ServerUnit } from "../../../server/scenes/ServerUnit";

// playable character in battle
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

    this.myScene.socket.on("endPlayerTurn", (playerInfo: ServerUnit) => {
      if (playerInfo.playerId === this.id) {
        this.endTurnAfterServerConfirmation(playerInfo);
      }
    });
  }

  // plays at the end of deplacement
  override nextAction(): void {
    this.myScene.clearAccessibleTiles();
    this.myScene.refreshAccessibleTiles();
    this.myScene.highlightAccessibleTiles(this.myScene.accessibleTiles);
  }

  override endTurn(): void {
    this.myScene.socket.emit("playerClickedEndTurn", this.id);
  }

  private endTurnAfterServerConfirmation(playerInfo: ServerUnit) {
    this.synchronizeWithServerUnit(playerInfo);
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
      this.myScene.refreshAccessibleTiles();
      this.myScene.highlightAccessibleTiles(this.myScene.accessibleTiles);
    }
  }
}
