import Phaser from "phaser";
import { Unit } from "./Unit";

/** Non playable characters in battle. */
export class Npc extends Unit {
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
}
