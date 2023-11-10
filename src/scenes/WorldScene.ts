import Phaser from "phaser";
import findPath from "../utils/findPath";
import { WorldUnit } from "../classes/world/WorldUnit";
import { WorldNpc } from "../classes/world/WorldNpc";
import { amazon, snowman, unitsAvailable } from "../data/UnitData";
import { io } from "socket.io-client";
import { OnlinePlayer } from "../server/server";

interface UnitPosition {
  indX: number;
  indY: number;
  type: string;
  id: number;
}

export class WorldScene extends Phaser.Scene {
  startPlayerPosX = 3;
  startPlayerPosY = 6;
  playerType = amazon;

  player!: WorldUnit;
  spawns!: Phaser.Physics.Arcade.Group;
  unitScale = 1.5;
  animFramerate = 7;

  background: Phaser.Tilemaps.TilemapLayer;
  tileWidth: number;
  tileHeight: number;
  map: Phaser.Tilemaps.Tilemap;
  obstacles: Phaser.Tilemaps.TilemapLayer;
  tileset: Phaser.Tilemaps.Tileset;
  enemyPositions: UnitPosition[] = [];
  enemyId: number;
  battleHasStarted: boolean;
  socket: any;
  otherPlayers: Phaser.Physics.Arcade.Group;

  constructor() {
    super({
      key: "WorldScene",
    });
  }

  create(data: any): void {
    this.setupWeb();

    this.battleHasStarted = false;
    // enemy id sent back from the victorious battle
    this.enemyId = data.enemyId;

    this.createTilemap();
    this.addPlayer();
    this.setupCamera();
    this.addEnemies(30);

    this.enableMovingOnClick(this.background, this.obstacles);
  }

  setupWeb() {
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on("newPlayer", (playerInfo: OnlinePlayer) => {
      this.addOtherPlayers(playerInfo);
    });
  }

  addOtherPlayers(playerInfo: OnlinePlayer) {
    const otherPlayer = this.add
      .sprite(playerInfo.x, playerInfo.y, "player", 4)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(53, 40);
    otherPlayer.type = playerInfo.id;
    this.otherPlayers.add(otherPlayer);
  }

  private setupCamera() {
    const zoom = 2;
    this.cameras.main.setZoom(zoom);

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player);
    this.cameras.main.roundPixels = true;
  }

  private addPlayer() {
    const startIndX = this.startPlayerPosX;
    const startIndY = this.startPlayerPosY;
    const playerPosX = this.player ? this.player.indX : startIndX;
    const playerPosY = this.player ? this.player.indY : startIndY;
    const playerData = this.playerType;
    this.player = new WorldUnit(
      this,
      playerPosX,
      playerPosY,
      "player",
      playerData.frame,
      playerData.name
    );
    this.physics.add.existing(this.player);
    this.add.existing(this.player);
    this.player.scale = this.unitScale;
    if (!this.anims.exists("left" + this.player.type)) {
      this.createAnimations(
        playerData.frame,
        this.animFramerate,
        this.player.type
      );
    }
  }

  private createTilemap() {
    this.map = this.make.tilemap({ key: "map" });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;
    this.tileset = this.map.addTilesetImage("forest_tilemap", "tiles");
    this.background = this.map.createLayer(
      "calque_background",
      this.tileset!,
      0,
      0
    );
    this.obstacles = this.map.createLayer(
      "calque_obstacles",
      this.tileset!,
      0,
      0
    );
    // layer for tall items appearing on top of the player like trees
    this.map
      .createLayer("calque_devant_joueur", this.tileset!, 0, 0)
      .setDepth(9999);
  }

  private addEnemies(enemyNumber: number) {
    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
    });

    // if no enemies already, create them
    const create = this.enemyPositions.length === 0;

    // if we just defeated an enemy in battle, delete it from the world map
    if (this.enemyId !== undefined) {
      const index = this.enemyPositions.findIndex(
        (enemy) => enemy.id === this.enemyId
      );
      if (index !== -1) this.enemyPositions.splice(index, 1);
    }

    const currentEnemyCount = create ? enemyNumber : this.enemyPositions.length;

    for (let i = 0; i < currentEnemyCount; i++) {
      let indX: number, indY: number;
      let id: number;
      let enemyType: string;
      // if enemies not already created, create them randomly on the map
      if (create) {
        do {
          indX = Phaser.Math.RND.between(0, this.map.width);
          indY = Phaser.Math.RND.between(0, this.map.height - 1);
        } while (this.obstacles.getTileAt(indX, indY));
        // toss a coin between snowman and dude...
        enemyType = Phaser.Math.RND.between(0, 1) ? "Snowman" : "Dude";

        // remember the enemy's position to recreate it later
        id = i;
        this.enemyPositions.push({
          indX: indX,
          indY: indY,
          type: enemyType,
          id: id,
        });
        // else if enemies already created, replace them to their previous position
      } else {
        const myPosition = this.enemyPositions[i];
        indX = myPosition.indX;
        indY = myPosition.indY;
        enemyType = myPosition.type;
        id = myPosition.id;
      }

      // find enemy data from its type
      const enemyData = unitsAvailable.find(
        (unitData) => unitData.name === enemyType
      );

      if (!this.anims.exists("left" + enemyData.name)) {
        this.createAnimations(
          enemyData.frame,
          this.animFramerate,
          enemyData.name
        );
      }

      const myEnemy = new WorldNpc(
        this,
        id,
        indX,
        indY,
        "player",
        enemyData.frame,
        enemyType
      );
      this.spawns.add(myEnemy, true);
      myEnemy.setHitboxScale(1.5);
      myEnemy.scale = this.unitScale;
    }
    this.physics.add.overlap(
      this.player,
      this.spawns,
      this.onMeetEnemy,
      undefined,
      this
    );
  }

  onMeetEnemy(player: any, enemy: any) {
    if (!this.battleHasStarted) {
      this.battleHasStarted = true;
      // shake the world
      this.cameras.main.shake(300);
      // start battle
      this.time.addEvent({
        delay: 300,
        callback: () =>
          this.scene.start("BattleScene", {
            playerType: player.type,
            enemyType: enemy.type,
            enemyId: enemy.id,
          }),
        callbackScope: this,
      });
    }
  }

  enableMovingOnClick(
    background: Phaser.Tilemaps.TilemapLayer,
    obstacles: Phaser.Tilemaps.TilemapLayer
  ) {
    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        if (this.player.isMoving) {
          this.player.interruptMovement();
        }
        const { worldX, worldY } = pointer;
        const startVec = new Phaser.Math.Vector2(
          this.player.indX,
          this.player.indY
        );
        const targetVec = background.worldToTileXY(worldX, worldY);
        const path = findPath(startVec, targetVec, background, obstacles);
        if (path && path.length > 0) {
          this.player.moveAlong(path);
        }
      }
    );

    // clean up on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });
  }

  // create a set of animations from a framerate and a base sprite
  createAnimations = (baseSprite: number, framerate: number, name: string) => {
    // animation for 'left' move, we don't need left and right
    // as we will use one and flip the sprite
    this.anims.create({
      key: "left" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 1,
          baseSprite + 10,
          baseSprite + 1,
          baseSprite + 19,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'left attack'
    this.anims.create({
      key: "leftAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 10, baseSprite + 1],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'right'
    this.anims.create({
      key: "right" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 1,
          baseSprite + 10,
          baseSprite + 1,
          baseSprite + 19,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'right attack'
    this.anims.create({
      key: "rightAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 10, baseSprite + 1],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'up'
    this.anims.create({
      key: "up" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 2,
          baseSprite + 11,
          baseSprite + 2,
          baseSprite + 20,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'up attack'
    this.anims.create({
      key: "upAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 11, baseSprite + 2],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'down'
    this.anims.create({
      key: "down" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite, baseSprite + 9, baseSprite, baseSprite + 18],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'down attack'
    this.anims.create({
      key: "downAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 9, baseSprite],
      }),
      frameRate: framerate,
      repeat: 0,
    });
  };
}
