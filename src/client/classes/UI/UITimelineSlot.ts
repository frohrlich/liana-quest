import Phaser from "phaser";
import { Unit } from "../battle/Unit";

/** Represents a unit in the timeline. */
export class UITimelineSlot extends Phaser.GameObjects.Image {
  unit: Unit;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unit: Unit,
    size: number
  ) {
    super(scene, x, y, unit.texture, unit.frameNumber);
    this.unit = unit;
    this.unit.addTimelineSlot(this);
    this.setScale(size);
    this.setAlpha(0.8);
  }
}
