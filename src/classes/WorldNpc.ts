import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";
import findPath from "../utils/findPath";

// Unit in the world mode, as opposed to the Unit class for battle
export class WorldNpc extends WorldUnit {
  movingDelay = 10000;
  movingSize = 3;

  constructor(
    scene: Phaser.Scene,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string
  ) {
    super(scene, indX, indY, texture, frame, name);
    this.moveRandomly(this.movingDelay, this.movingSize);
  }

  moveRandomly(delay: number, size: number) {
    const movingOffset = Phaser.Math.Between(0, delay);
    this.scene.time.addEvent({
      delay: delay,
      callback: this.moveToRandomNearbyTile,
      args: [size],
      callbackScope: this,
      loop: true,
      startAt: movingOffset,
    });
  }

  moveToRandomNearbyTile(size: number) {
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    // first calculate the accessible tiles around npc
    const nearbyTiles = this.myScene.background.filterTiles(
      (tile: Phaser.Tilemaps.Tile) =>
        !this.myScene.obstacles.getTileAt(tile.x, tile.y),
      this.scene,
      this.indX - size,
      this.indY - size,
      size * 2 + 1,
      size * 2 + 1
    );
    // then chooses one randomly
    const randMove = Phaser.Math.Between(0, nearbyTiles.length - 1);
    const targetVec = new Phaser.Math.Vector2(
      nearbyTiles[randMove].x,
      nearbyTiles[randMove].y
    );
    const path = findPath(
      startVec,
      targetVec,
      this.myScene.background,
      this.myScene.obstacles
    );
    if (path) {
      this.moveAlong(path);
    }
  }
}
