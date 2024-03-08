import Phaser from "phaser";
import { Card } from "../classes/world/Card";
import { GAME_HEIGHT, GAME_WIDTH } from "../app";
import { findUnitDataByType } from "../data/UnitData";
import { Socket, io } from "socket.io-client";

export class ChooseCardScene extends Phaser.Scene {
  cardMargin = 20;

  socket: Socket;
  currentCharacterChoice: string;

  constructor() {
    super({
      key: "ChooseCardScene",
    });
  }

  create() {
    const token = getCookie("jwt");
    this.socket = io("http://localhost:8081", {
      query: { token },
    });
    this.socket.on("playerTypeUpdated", (type: string) => {
      if (this.currentCharacterChoice === type) {
        this.scene.start("WorldScene");
      }
    });
    // add cards
    const card1 = new Card(
      this,
      0,
      GAME_HEIGHT / 2,
      findUnitDataByType("Amazon")
    ).setDepth(2);
    const card2 = new Card(
      this,
      card1.displayWidth * 1.5 + this.cardMargin * 2,
      GAME_HEIGHT / 2,
      findUnitDataByType("Renegade")
    ).setDepth(1);
    const card3 = new Card(
      this,
      card1.displayWidth * 2.5 + this.cardMargin * 3,
      GAME_HEIGHT / 2,
      findUnitDataByType("Stranger"),
      true
    );
    card1.x = card1.displayWidth / 2 + this.cardMargin;
    this.add.existing(card1);
    this.add.existing(card2);
    this.add.existing(card3);
    const chooseTextX = card1.displayWidth * 3 + this.cardMargin * 3 + 14;

    // add choose your fighter text/button
    const chooseText = this.add
      .bitmapText(
        chooseTextX,
        GAME_HEIGHT / 2,
        "dogicapixelbold",
        "Choose your \nfighter !",
        24
      )
      .setDepth(-1)
      .setOrigin(0, 0.5);
    const buttonMargin = 3;
    const chooseButton = this.add
      .rectangle(
        chooseText.x - buttonMargin,
        chooseText.y - buttonMargin / 2,
        chooseText.displayWidth - 6,
        chooseText.displayHeight + buttonMargin * 2,
        0x003700
      )
      .setStrokeStyle(2, 0xffffff)
      .setDepth(-2)
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setInteractive()
      .on("pointerup", () => {
        this.sendCharacterChoiceToServer();
      });

    // add character description on bottom
    const characterDescription = this.add.bitmapText(
      10,
      card1.getBounds().bottom + 20,
      "dogicapixel",
      "",
      16
    );

    // add events on clicking cards
    card1.on("pointerup", () => {
      toggleCardsVisibility(card2, card3);
      toggleChooseFighter(chooseText, chooseButton, card1.unitData.type);
      this.currentCharacterChoice = card1.unitData.type;
      if (characterDescription.text === card1.unitData.description) {
        characterDescription.text = "";
      } else {
        characterDescription.text = card1.unitData.description;
      }
    });
    card2.on("pointerup", () => {
      toggleCardsVisibility(card1, card3);
      toggleChooseFighter(chooseText, chooseButton, card2.unitData.type);
      this.currentCharacterChoice = card2.unitData.type;
      if (characterDescription.text === card2.unitData.description) {
        characterDescription.text = "";
      } else {
        characterDescription.text = card2.unitData.description;
      }
    });
    card3.on("pointerup", () => {
      toggleCardsVisibility(card1, card2);
      toggleChooseFighter(chooseText, chooseButton, card3.unitData.type);
      this.currentCharacterChoice = card3.unitData.type;
      if (characterDescription.text === card3.unitData.description) {
        characterDescription.text = "";
      } else {
        characterDescription.text = card3.unitData.description;
      }
    });

    // add legend
    const legendTopMargin = 10;
    // MP
    const MPLegend = this.add.bitmapText(
      chooseTextX,
      legendTopMargin,
      "dogicapixel",
      "Movement points",
      16
    );
    // HP
    const HPLegend = this.add
      .bitmapText(
        chooseTextX,
        MPLegend.getBottomLeft().y,
        "dogicapixel",
        "Health points",
        16
      )
      .setTint(0xff0000);
    // AP
    const APLegend = this.add
      .bitmapText(
        chooseTextX,
        HPLegend.getBottomLeft().y,
        "dogicapixel",
        "Action points",
        16
      )
      .setTint(0x33c6f7);

    // add info tip on top left
    this.add.bitmapText(
      10,
      10,
      "dogicapixel",
      "Touch a spell icon to see its effects. Tap anywhere on a card to select/unselect it.",
      8
    );
  }

  sendCharacterChoiceToServer() {
    this.socket.emit("choosePlayerCard", this.currentCharacterChoice);
  }
}

const toggleCardsVisibility = (...cards: Card[]) => {
  cards.forEach((card) => {
    card.setVisible(!card.visible);
  });
};

const toggleChooseFighter = (
  chooseText: Phaser.GameObjects.BitmapText,
  chooseButton: Phaser.GameObjects.Rectangle,
  type: string
) => {
  const defaultText = "Choose your \nfighter !";
  if (chooseText.text === defaultText) {
    chooseText.text = `Choose\n${type} ?`;
    chooseText.tint = 0x00ff00;
    chooseButton.setVisible(true);
    chooseButton.displayWidth = chooseText.displayWidth + 5;
  } else {
    chooseText.text = defaultText;
    chooseText.tint = 0xffffff;
    chooseButton.setVisible(false);
  }
};

function getCookie(name: string): string {
  const nameLenPlus = name.length + 1;
  return (
    document.cookie
      .split(";")
      .map((c) => c.trim())
      .filter((cookie) => {
        return cookie.substring(0, nameLenPlus) === `${name}=`;
      })
      .map((cookie) => {
        return decodeURIComponent(cookie.substring(nameLenPlus));
      })[0] || null
  );
}
