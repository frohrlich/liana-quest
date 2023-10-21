import "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { UIScene } from "./scenes/UIScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { WorldScene } from "./scenes/WorldScene";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 642,
  height: 430,
  zoom: 1.4,
  pixelArt: true,
  backgroundColor: "#FFFFFF",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: true,
    },
  },
  scene: [BootScene, WorldScene, BattleScene, UIScene, GameOverScene],
};
export class RpgGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}
window.onload = () => {
  var game = new RpgGame(config);
};
