import Phaser from "phaser";
import { findWorldMapByName } from "../data/WorldData";
import { GAME_HEIGHT, GAME_WIDTH } from "../app";

export class BootScene extends Phaser.Scene {
  socket: any;
  constructor() {
    super({
      key: "BootScene",
    });
  }

  preload(): void {
    // progress bar
    const progressBarHeight = 50;
    const progressBarOffset = 10;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(
      GAME_WIDTH / 4,
      GAME_HEIGHT / 2 - progressBarHeight / 2,
      GAME_WIDTH / 2,
      progressBarHeight
    );

    this.load.on("progress", function (value: number) {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(
        GAME_WIDTH / 4 + progressBarOffset,
        GAME_HEIGHT / 2 - progressBarHeight / 2 + progressBarOffset,
        (GAME_WIDTH / 2 - progressBarOffset * 2) * value,
        30
      );
    });
    this.load.on("fileprogress", function (file) {
      // console.log(`Loading : ${file.src}`);
    });
    this.load.on("complete", function () {
      progressBar.destroy();
      progressBox.destroy();
    });

    // map tiles
    this.load.image("forest_tiles", "public/assets/map/spritesheet.png");
    this.load.image(
      "dungeon_tiles",
      "public/assets/map/dungeon_spritesheet.png"
    );

    // maps in json format
    this.load.tilemapTiledJSON(
      "forest_map",
      "public/assets/map/forest_map.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_map",
      "public/assets/map/dungeon_map.json"
    );

    this.load.tilemapTiledJSON(
      "forest_battlemap1",
      "public/assets/map/forest_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap2",
      "public/assets/map/forest_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap3",
      "public/assets/map/forest_battlemap3.json"
    );

    this.load.tilemapTiledJSON(
      "dungeon_battlemap1",
      "public/assets/map/dungeon_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_battlemap2",
      "public/assets/map/dungeon_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_battlemap3",
      "public/assets/map/dungeon_battlemap3.json"
    );

    // characters and 16x16 icons
    this.load.spritesheet("player", "public/assets/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // illustrations
    this.load.image("princess", "public/assets/images/princess.png");
    this.load.image("AmazonIllus", "public/assets/images/amazon.png");
    this.load.image(
      "loginBackground",
      "public/assets/images/loginBackground.png"
    );

    // fonts
    this.load.bitmapFont(
      "dogicapixel",
      "public/assets/fonts/dogicapixel.png",
      "public/assets/fonts/dogicapixel.xml"
    );
    this.load.bitmapFont(
      "dogicapixelbold",
      "public/assets/fonts/dogicapixelbold.png",
      "public/assets/fonts/dogicapixelbold.xml"
    );

    // dom
    this.load.html("loginform", "public/assets/text/loginform.html");
    this.load.html("registerform", "public/assets/text/registerform.html");
    this.load.html(
      "forgotpasswordform",
      "public/assets/text/forgotpasswordform.html"
    );
    this.load.html("chatform", "public/assets/text/chatform.html");
  }

  create(): void {
    // this.scene.start("WorldScene", findWorldMapByName("forest"));
    this.scene.start("LoginScene");
  }
}
