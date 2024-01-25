import Phaser from "phaser";
import { BattleScene } from "../scenes/BattleScene";

/** Line of sight algorithm.
 * @see {@link https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm}
 */
const isVisible = (
  startVec: Phaser.Math.Vector2,
  targetVec: Phaser.Math.Vector2,
  obstaclesLayer: Phaser.Tilemaps.TilemapLayer,
  transparentObstaclesLayer: Phaser.Tilemaps.TilemapLayer,
  myScene: BattleScene
) => {
  let { x: x0, y: y0 } = startVec;
  const { x: x1, y: y1 } = targetVec;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  // regular obstacles (not units) are not targetable
  if (
    transparentObstaclesLayer.getTileAt(x1, y1) ||
    (obstaclesLayer.getTileAt(x1, y1) && !myScene.isUnitThere(x1, y1))
  ) {
    return false;
  }

  while (true) {
    // if not starter position and we encounter an obstacle : not visible, stop
    if (
      !(x0 == startVec.x && y0 == startVec.y) &&
      obstaclesLayer.getTileAt(x0, y0)
    ) {
      // if we reached destination and there is a unit there : it's visible
      // if it's a regular obstacle, it's not visible
      if (x0 == x1 && y0 == y1 && myScene.isUnitThere(x0, y0)) return true;
      return false;
    }
    if (x0 == x1 && y0 == y1) return true;
    let e2 = 2 * error;
    if (e2 >= dy) {
      if (x0 == x1) break;
      error = error + dy;
      x0 = x0 + sx;
    }
    if (e2 <= dx) {
      if (y0 == y1) break;
      error = error + dx;
      y0 = y0 + sy;
    }
  }
  return true;
};

export default isVisible;
