import Phaser from "phaser";
import { Card } from "../classes/world/Card";
import { GAME_HEIGHT, GAME_WIDTH } from "../app";
import { findUnitDataByType } from "../data/UnitData";

export class ChooseCardScene extends Phaser.Scene {
  constructor() {
    super({
      key: "ChooseCardScene",
    });
  }

  create() {
    this.add.existing(
      new Card(
        this,
        GAME_WIDTH / 4,
        GAME_HEIGHT / 2,
        findUnitDataByType("Amazon")
      )
    );
    this.add.existing(
      new Card(
        this,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        findUnitDataByType("Renegade")
      )
    );
    this.add.existing(
      new Card(
        this,
        (GAME_WIDTH * 3) / 4,
        GAME_HEIGHT / 2,
        findUnitDataByType("Stranger")
      )
    );
  }
}
