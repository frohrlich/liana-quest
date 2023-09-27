import "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { UIScene } from "./scenes/UIScene";
import { GameOverScene } from "./scenes/GameOverScene";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1920,
  height: 1080,
  zoom: 0.55,
  pixelArt: true,
  backgroundColor: "#FFFFFF",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, BattleScene, UIScene, GameOverScene],
};
export class RpgGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}
window.onload = () => {
  var game = new RpgGame(config);
};
