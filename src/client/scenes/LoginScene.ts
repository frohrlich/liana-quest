import Phaser from "phaser";
import { findWorldMapByName } from "../data/WorldData";
import { GAME_HEIGHT, GAME_WIDTH } from "../app";

export class LoginScene extends Phaser.Scene {
  loginFormHeight = 320;
  loginFormWidth = 298;
  loginForm: Phaser.GameObjects.DOMElement;
  registerForm: Phaser.GameObjects.DOMElement;

  constructor() {
    super({
      key: "LoginScene",
    });
  }

  create() {
    this.add
      .image(0, 0, "loginBackground")
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setOrigin(0, 0);

    this.add.bitmapText(10, 10, "dogicapixelbold", "Liana Quest", 32);

    this.displayLoginForm();
  }

  displayLoginForm() {
    this.createLoginForm();
    this.activateAndDisplayLoginForm();
  }

  displayRegisterForm() {
    this.createRegisterForm();
    this.activateAndDisplayRegisterForm();
  }

  private createLoginForm() {
    this.loginForm = this.add
      .dom(
        this.game.canvas.width / 2 - this.loginFormWidth / 2,
        this.game.canvas.height / 2 - this.loginFormHeight / 2
      )
      .createFromCache("loginform")
      .setVisible(false)
      .setOrigin(0, 0);
  }

  private createRegisterForm() {
    this.registerForm = this.add
      .dom(
        this.game.canvas.width / 2 - this.loginFormWidth / 2,
        this.game.canvas.height / 2 - this.loginFormHeight / 2
      )
      .createFromCache("registerform")
      .setVisible(false)
      .setOrigin(0, 0);
  }

  private activateAndDisplayLoginForm() {
    this.loginForm.addListener("click");
    const that = this;

    this.loginForm.on("click", function (event) {
      if (event.target.name === "loginButton") {
        const inputUsername = this.getChildByName("email");
        const inputPassword = this.getChildByName("password");

        //  Have they entered anything?
        if (inputUsername.value !== "" && inputPassword.value !== "") {
          //  Turn off the click events
          this.removeListener("click");
          // Start world scene
          that.scene.start("WorldScene", findWorldMapByName("forest"));
        }
      } else if (event.target.name === "registerButton") {
        that.loginForm.destroy();
        that.displayRegisterForm();
      }
    });

    this.loginForm.setVisible(true);
  }

  private activateAndDisplayRegisterForm() {
    this.registerForm.addListener("click");
    const that = this;

    this.registerForm.on("click", function (event) {
      if (event.target.name === "registerButton") {
        const inputUsername = this.getChildByName("username");
        const inputEmail = this.getChildByName("email");
        const inputPassword = this.getChildByName("password");

        //  Have they entered anything?
        if (
          inputUsername.value !== "" &&
          inputEmail.value !== "" &&
          inputPassword.value !== ""
        ) {
          //  Turn off the click events
          this.removeListener("click");
          // Start world scene
          that.scene.start("WorldScene", findWorldMapByName("forest"));
        }
      } else if (event.target.name === "loginLink") {
        that.registerForm.destroy();
        that.displayLoginForm();
      }
    });

    this.registerForm.setVisible(true);
  }
}
