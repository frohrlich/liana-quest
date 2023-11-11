import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";
import findPath from "../../utils/findPath";

export class WorldNpc extends WorldUnit {
  // delay between each random movement of the npc on the map
  movingDelay = 10000;
  // range (in tiles) of a random movement on the map
  movingRange = 3;
  // the id is used to link a world npc to its battle counterpart
  id: number;

  constructor(
    scene: Phaser.Scene,
    id: number,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string
  ) {
    super(scene, indX, indY, texture, frame, name);
    this.id = id;
    this.moveRandomly(this.movingDelay, this.movingRange);
  }

  moveRandomly(delay: number, range: number) {
    // random offset before first movement so that all npcs don't move simultaneously
    const movingOffset = Phaser.Math.Between(0, delay);
    this.scene.time.addEvent({
      delay: delay,
      callback: this.moveToRandomNearbyTile,
      args: [range],
      callbackScope: this,
      loop: true,
      startAt: movingOffset,
    });
  }

  moveToRandomNearbyTile(range: number) {
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    // first calculate the accessible tiles around npc
    const nearbyTiles = this.myScene.background.filterTiles(
      (tile: Phaser.Tilemaps.Tile) =>
        !this.myScene.obstacles.getTileAt(tile.x, tile.y),
      this.scene,
      this.indX - range,
      this.indY - range,
      range * 2 + 1,
      range * 2 + 1
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
