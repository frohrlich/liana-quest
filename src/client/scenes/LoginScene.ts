import Phaser from "phaser";
import { findWorldMapByName } from "../data/WorldData";
import { GAME_HEIGHT, GAME_WIDTH } from "../app";
import $ from "jquery";
import { refreshToken } from "../refreshToken";

export class LoginScene extends Phaser.Scene {
  loginFormHeight = 320;
  loginFormWidth = 298;
  loginForm: Phaser.GameObjects.DOMElement;
  registerForm: Phaser.GameObjects.DOMElement;
  forgotPasswordForm: Phaser.GameObjects.DOMElement;

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
        const inputEmail = this.getChildByName("email");
        const inputPassword = this.getChildByName("password");
        if (inputEmail.value !== "" && inputPassword.value !== "") {
          if (validateEmail(inputEmail.value)) {
            that.signIn(that.loginForm, inputEmail.value, inputPassword.value);
          } else {
            const errorMessage = this.getChildByID("errorMessage");
            errorMessage.innerHTML = "Please enter a valid email";
            errorMessage.removeAttribute("hidden");
          }
        }
      } else if (event.target.name === "registerButton") {
        that.loginForm.destroy();
        that.displayRegisterForm();
      } else if (event.target.name === "forgotLink") {
        that.loginForm.destroy();
        that.displayForgotPasswordForm();
      }
    });

    this.loginForm.setVisible(true);
  }

  displayForgotPasswordForm() {
    this.createForgotPasswordForm();
    this.activateAndDisplayForgotPasswordForm();
  }

  activateAndDisplayForgotPasswordForm() {
    this.forgotPasswordForm.addListener("click");
    const that = this;

    this.forgotPasswordForm.on("click", function (event) {
      if (event.target.name === "resetButton") {
        const inputEmail = this.getChildByName("email");
        if (inputEmail.value !== "") {
          if (validateEmail(inputEmail.value)) {
            that.forgotPassword(inputEmail.value);
          } else {
            const errorMessage = this.getChildByID("errorMessage");
            errorMessage.innerHTML = "Please enter a valid email";
            errorMessage.removeAttribute("hidden");
          }
        }
      } else if (event.target.name === "loginLink") {
        that.forgotPasswordForm.destroy();
        that.displayLoginForm();
      }
    });

    this.forgotPasswordForm.setVisible(true);
  }

  createForgotPasswordForm() {
    this.forgotPasswordForm = this.add
      .dom(
        this.game.canvas.width / 2 - this.loginFormWidth / 2,
        this.game.canvas.height / 2 - this.loginFormHeight / 2
      )
      .createFromCache("forgotpasswordform")
      .setVisible(false)
      .setOrigin(0, 0);
  }

  private activateAndDisplayRegisterForm() {
    this.registerForm.addListener("click");
    const that = this;

    this.registerForm.on("click", function (event) {
      if (event.target.name === "registerButton") {
        const inputUsername = this.getChildByName("username");
        const inputEmail = this.getChildByName("email");
        const inputPassword = this.getChildByName("password");
        if (
          inputUsername.value !== "" &&
          inputEmail.value !== "" &&
          inputPassword.value !== ""
        ) {
          if (validateEmail(inputEmail.value)) {
            that.signUp(
              inputEmail.value,
              inputUsername.value,
              inputPassword.value
            );
          } else {
            const errorMessage = this.getChildByID("errorMessage");
            errorMessage.innerHTML = "Please enter a valid email";
            errorMessage.removeAttribute("hidden");
          }
        }
      } else if (event.target.name === "loginLink") {
        that.registerForm.destroy();
        that.displayLoginForm();
      }
    });

    this.registerForm.setVisible(true);
  }

  signIn(form: Phaser.GameObjects.DOMElement, email: string, password: string) {
    const data = {
      email: email,
      password: password,
    };
    $.ajax({
      type: "POST",
      url: "/login",
      data,
      success: (data) => {
        // Start world scene
        this.scene.start("WorldScene", findWorldMapByName("forest"));
        refreshToken();
      },
      error: (xhr, status, error) => {
        const errorMessage = form.getChildByID("errorMessage");
        if (xhr.responseJSON) {
          errorMessage.innerHTML = xhr.responseJSON;
        } else {
          errorMessage.innerHTML = error;
        }
        errorMessage.removeAttribute("hidden");
      },
    });
  }

  signUp(email: string, username: string, password: string) {
    const data = {
      email: email,
      password: password,
      username: username,
    };
    $.ajax({
      type: "POST",
      url: "/signup",
      data,
      success: (data) => {
        const successMessage = this.registerForm.getChildByID("successMessage");
        const errorMessage = this.registerForm.getChildByID("errorMessage");
        errorMessage.setAttribute("hidden", "true");
        successMessage.innerHTML = "Register successful !";
        successMessage.removeAttribute("hidden");
        setTimeout(() => {
          this.registerForm.destroy();
          this.displayLoginForm();
        }, 1500);
      },
      error: (xhr, status, error) => {
        const errorMessage = this.registerForm.getChildByID("errorMessage");
        if (xhr.responseJSON) {
          errorMessage.innerHTML = xhr.responseJSON;
        } else {
          errorMessage.innerHTML = error;
        }
        errorMessage.removeAttribute("hidden");
      },
    });
  }

  forgotPassword(email: string) {
    const data = {
      email: email,
    };
    $.ajax({
      type: "POST",
      url: "/forgot-password",
      data,
      success: (data) => {
        const successMessage =
          this.forgotPasswordForm.getChildByID("successMessage");
        const errorMessage =
          this.forgotPasswordForm.getChildByID("errorMessage");
        errorMessage.setAttribute("hidden", "true");
        successMessage.innerHTML = "Email sent !";
        successMessage.removeAttribute("hidden");
      },
      error: (xhr, status, error) => {
        const errorMessage =
          this.forgotPasswordForm.getChildByID("errorMessage");
        if (xhr.responseJSON) {
          errorMessage.innerHTML = xhr.responseJSON.message;
        } else {
          errorMessage.innerHTML = error;
        }
        errorMessage.removeAttribute("hidden");
      },
    });
  }
}

const validateEmail = (email: string) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};
