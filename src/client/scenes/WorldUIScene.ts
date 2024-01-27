import Phaser from "phaser";
import { WorldScene } from "./WorldScene";
import { GAME_WIDTH, GAME_HEIGHT } from "../app";

/** World UI. */
export class WorldUIScene extends Phaser.Scene {
  chatBoxPositionX = 20;
  chatBoxPositionY = 20;
  chatBoxLinesDisplayed = 10;
  chatBoxWidth = 250;
  chatFormHeight = 35;
  fontSize = 16;

  worldScene: WorldScene;
  chatButtonText: Phaser.GameObjects.BitmapText;
  chatButton: Phaser.GameObjects.Graphics;
  offset = 0;
  chatForm: Phaser.GameObjects.DOMElement;
  interactiveChatButton: Phaser.GameObjects.Rectangle;
  chatLines: string[] = [];

  constructor() {
    super({
      key: "WorldUIScene",
    });
  }

  create(): void {
    this.worldScene = this.scene.get("WorldScene") as WorldScene;
    this.createChatButton();
    this.createChatForm();
  }

  listenToNewMessages() {
    this.worldScene.socket.on(
      "newChatMessageWasSent",
      (playerName, message) => {
        this.chatLines.push(`${playerName}: ${message}`);
        const chatBox = this.chatForm.node.querySelector(
          "#chatBox"
        ) as HTMLElement;
        chatBox.innerText = this.chatLines.join("\n");
        chatBox.scrollTop = chatBox.scrollHeight; // hack to always have chat scrolled to bottom
      }
    );
  }

  createChatForm() {
    this.chatForm = this.add
      .dom(this.chatBoxPositionX, this.chatBoxPositionY)
      .createFromCache("chatform")
      .setVisible(false);
    this.chatForm.addListener("click");

    // enable chat on press enter
    const chatInput = this.chatForm.node.querySelector("#chat");
    chatInput.addEventListener("keypress", function (event: KeyboardEvent) {
      if (event.key === "Enter") {
        const button = chatInput.nextElementSibling as HTMLElement;
        button.click();
      }
    });

    // and on click
    this.chatForm.on("click", (event) => {
      if (event.target.name === "sayButton") {
        const input = event.target.previousElementSibling;
        const chatBox = event.target.nextElementSibling;
        if (input.value !== "") {
          this.worldScene.socket.emit("newChatMessageSent", input.value);
          this.chatLines.push(`${this.worldScene.player.type}: ${input.value}`);
          chatBox.innerText = this.chatLines.join("\n");
          chatBox.scrollTop = chatBox.scrollHeight; // hack to always have chat scrolled to bottom
          input.value = "";
        }
      }
    });
  }

  createChatButton() {
    const chatButtonWidth = 75;
    const chatButtonHeight = 50;
    const margin = 10;

    this.chatButton = this.add.graphics();
    this.chatButton.fillStyle(0x1f301d, 0.9);
    this.chatButton.lineStyle(4, 0xffffff, 0.9);

    this.chatButton
      .fillRoundedRect(
        GAME_WIDTH - chatButtonWidth - margin,
        GAME_HEIGHT - chatButtonHeight - margin,
        chatButtonWidth,
        chatButtonHeight,
        5
      )
      .strokeRoundedRect(
        GAME_WIDTH - chatButtonWidth - margin,
        GAME_HEIGHT - chatButtonHeight - margin,
        chatButtonWidth,
        chatButtonHeight,
        5
      );

    // need this to click on chat button
    // as graphics objects are not interactive
    this.interactiveChatButton = this.add
      .rectangle(
        GAME_WIDTH - chatButtonWidth - margin,
        GAME_HEIGHT - chatButtonHeight - margin,
        chatButtonWidth,
        chatButtonHeight
      )
      .setOrigin(0, 0)
      .setInteractive()
      .on("pointerup", () => this.toggleChatBox());

    this.chatButtonText = this.add
      .bitmapText(
        GAME_WIDTH - chatButtonWidth / 2 - margin,
        GAME_HEIGHT - chatButtonHeight / 2 - margin,
        "dogicapixel",
        "Chat",
        16
      )
      .setOrigin(0.5, 0.5);
  }

  toggleChatBox() {
    if (this.chatForm.visible) {
      this.chatForm.setVisible(false);
    } else {
      this.chatForm.setVisible(true);
    }
  }
}
