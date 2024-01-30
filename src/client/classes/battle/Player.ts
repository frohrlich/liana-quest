import Phaser from "phaser";
import { Unit } from "./Unit";
import { Spell } from "./Spell";
import { ServerUnit } from "../../../server/classes/ServerUnit";

/** Playable character in battle. */
export class Player extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    baseTint: number,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    isTeamA: boolean
  ) {
    super(
      scene,
      x,
      y,
      texture,
      baseTint,
      frame,
      indX,
      indY,
      maxPm,
      maxPa,
      maxHp,
      isTeamA
    );
  }

  /** Plays at the end of deplacement. */
  override nextAction(): void {
    this.myScene.clearAccessibleTiles();
    this.myScene.refreshAccessibleTiles();
    this.myScene.highlightAccessibleTiles(this.myScene.accessibleTiles);
  }

  override endTurn(): void {
    this.myScene.socket.emit("playerClickedEndTurn");
  }

  endTurnAfterServerConfirmation(playerInfo: ServerUnit) {
    this.synchronizeWithServerUnit(playerInfo);
    const scene = this.myScene;
    scene.uiScene.endPlayerTurn();
    scene.clearSpellRange();
    scene.uiScene.clearSpellsHighlight();
  }

  override castSpell(
    spell: Spell,
    targetVec: Phaser.Math.Vector2,
    affectedUnits: ServerUnit[],
    serverSummonedUnit: ServerUnit,
    timeline: ServerUnit[]
  ): void {
    super.castSpell(
      spell,
      targetVec,
      affectedUnits,
      serverSummonedUnit,
      timeline
    );
    this.myScene.refreshAccessibleTiles();

    if (serverSummonedUnit) {
      const mySummonedUnit = this.summonedUnits[this.summonedUnits.length - 1];
      this.myScene.activateSpellEvents(
        mySummonedUnit,
        new Phaser.Math.Vector2(mySummonedUnit.indX, mySummonedUnit.indY),
        spell,
        this.myScene.backgroundLayer.getTileAt(targetVec.x, targetVec.y)
      );
    }

    this.myScene.uiScene.refreshUIAfterSpell(spell);

    // if spell not available anymore : quit spell mode
    if (this.pa < spell.cost || spell.cooldown > 0) {
      this.myScene.clearSpellRange();
      this.myScene.uiScene.clearSpellsHighlight();
      this.myScene.highlightAccessibleTiles(this.myScene.accessibleTiles);
      // else display aoe again
    } else if (this.myScene.spellVisible) {
      this.myScene.clearSpellRange();
      this.myScene.uiScene.clearSpellsHighlight();
      this.myScene.displaySpellRange(spell);
      this.myScene.updateAoeZone(
        spell,
        this.myScene.map.tileToWorldX(targetVec.x),
        this.myScene.map.tileToWorldY(targetVec.y)
      );
    }
  }
}
