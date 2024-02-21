import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../app";
import { Socket } from "socket.io-client";

/** Chat UI Scene. Contains the chat button, chat input and chat box. */
export class ChatScene extends Phaser.Scene {
  chatBoxPositionX = 20;
  chatBoxPositionY = 20;
  chatBoxLinesDisplayed = 10;
  chatBoxWidth = 250;
  chatFormHeight = 35;
  fontSize = 16;

  socket: Socket;
  chatButtonText: Phaser.GameObjects.BitmapText;
  chatButton: Phaser.GameObjects.Graphics;
  offset = 0;
  chatForm: Phaser.GameObjects.DOMElement;
  interactiveChatButton: Phaser.GameObjects.Rectangle;
  chatLines: string[] = [];

  constructor() {
    super({
      key: "ChatScene",
    });
  }

  create(): void {
    this.createChatButton();
    this.createChatForm();
  }

  listenToNewMessages(socket: Socket) {
    this.socket = socket;
    socket.on("newChatMessageWasSent", (username, message) => {
      this.chatLines.push(`<strong>${username}:</strong> ${message}`);
      const chatBox = this.chatForm.node.querySelector(
        "#chatBox"
      ) as HTMLElement;
      chatBox.innerHTML = this.chatLines.join("<br>");
      chatBox.scrollTop = chatBox.scrollHeight; // hack to always have chat scrolled to bottom
    });
  }

  createChatForm() {
    this.chatForm = this.add
      .dom(this.chatBoxPositionX, this.chatBoxPositionY)
      .createFromCache("chatform")
      .setVisible(false)
      .setOrigin(0, 0);
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
        if (input.value !== "" && this.socket) {
          this.socket.emit("newChatMessageSent", input.value);
          input.value = "";
        }
      }
    });
  }

  createChatButton() {
    const chatButtonWidth = 70;
    const chatButtonHeight = 40;
    const margin = 9;

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
