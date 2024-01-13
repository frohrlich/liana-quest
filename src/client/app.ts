import "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { UIScene } from "./scenes/UIScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { WorldScene } from "./scenes/WorldScene";
import screenfull from "screenfull";
import { UAParser } from "ua-parser-js";
import { DialogScene } from "./scenes/DialogScene";

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game",
    width: 930, // xiaomi mi a3 : 19.5:9 ratio
    height: 430,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    WorldScene,
    DialogScene,
    BattleScene,
    UIScene,
    GameOverScene,
  ],
};
export class RpgGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}
window.onload = () => {
  const parser = new UAParser();
  const isNotDesktop =
    parser.getDevice().type === "mobile" ||
    parser.getDevice().type === "tablet";

  const gameDiv = document.getElementById("game");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const fullscreenButtonDiv = document.getElementById("fullscreenButton-div");
  fullscreenButton.addEventListener("click", () => {
    gameDiv.hidden = false;
    fullscreenButton.hidden = true;
    fullscreenButtonDiv.style.display = "none";
    if (isNotDesktop) {
      if (screenfull.isEnabled) {
        screenfull.request(gameDiv);
        window.screen.orientation["lock"]("landscape");
      } else {
        alert("Error ! Please refresh your navigator.");
      }
    }
  });

  // gameDiv.hidden = false;
  // fullscreenButton.hidden = true;
  // fullscreenButtonDiv.style.display = "none";

  var game = new RpgGame(config);
};
