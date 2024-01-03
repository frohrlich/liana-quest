import Phaser from "phaser";
import { WorldNpc } from "../classes/world/WorldNpc";
import { UnitData, unitsAvailable } from "../data/UnitData";
import { Socket, io } from "socket.io-client";
import { ServerWorldUnit } from "../../server/scenes/ServerWorldScene";
import { WorldOnlinePlayer } from "../classes/world/WorldOnlinePlayer";
import { BattleIcon } from "../classes/world/BattleIcon";
import { ServerUnit } from "../../server/classes/ServerUnit";

interface UnitPosition {
  indX: number;
  indY: number;
  type: string;
  id: number;
}

export class WorldScene extends Phaser.Scene {
  player!: WorldOnlinePlayer;
  spawns!: Phaser.Physics.Arcade.Group;
  battleIcons: BattleIcon[] = [];
  unitScale = 1.5;
  animFramerate = 7;
  npcBattleShieldFrame = 54;

  background: Phaser.Tilemaps.TilemapLayer;
  tileWidth: number;
  tileHeight: number;
  map: Phaser.Tilemaps.Tilemap;
  obstacles: Phaser.Tilemaps.TilemapLayer;
  tileset: Phaser.Tilemaps.Tileset;
  enemyPositions: UnitPosition[] = [];
  battleHasStarted: boolean;
  socket: Socket;
  otherPlayers: WorldOnlinePlayer[] = [];
  devantJoueur: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super({
      key: "WorldScene",
    });
  }

  create(): void {
    this.battleHasStarted = false;
    this.createTilemap();
    // tells server scene is ready to receive info
    this.events.once("preupdate", () => {
      this.initSocket();
      this.setupWeb();
      this.socket.emit("worldSceneIsReady");
    });
  }

  showTileMapLayers() {
    this.background.setVisible(true);
    this.obstacles.setVisible(true);
    this.devantJoueur.setVisible(true);
  }

  setupWeb() {
    this.socket.off();

    this.socket.on("disconnect", () => {
      setTimeout(() => {
        location.reload();
      }, 200);
    });

    this.socket.on("newPlayer", (playerInfo: ServerWorldUnit) => {
      this.addOtherPlayers(playerInfo);
    });

    this.socket.on("playerLeft", (playerId: string) => {
      this.otherPlayers.forEach((otherPlayer: WorldOnlinePlayer) => {
        if (playerId === otherPlayer.id) {
          otherPlayer.destroy();
        }
      });
      const index = this.otherPlayers.findIndex(
        (player) => player.id === playerId
      );
      if (index !== -1) {
        this.otherPlayers.splice(index, 1);
      }
    });

    this.socket.on("currentPlayers", (players: ServerWorldUnit[]) => {
      players.forEach((player) => {
        if (player.id === this.socket.id) {
          this.addPlayer(player);
          this.setupCamera();
          this.showTileMapLayers();
          this.enableMovingOnClick(this.background, this.obstacles);
        } else {
          this.addOtherPlayers(player);
        }
      });
    });

    this.socket.on(
      "playerVisibilityChanged",
      (id: string, isVisible: boolean) => {
        this.otherPlayers.forEach((player) => {
          if (player.id === id) {
            player.setVisible(isVisible);
          }
        });
      }
    );

    this.socket.on("currentNpcs", (npcs: ServerWorldUnit[]) => {
      this.addEnemies(npcs);
    });

    this.socket.on("enemyWasKilled", (id: string) => {
      this.spawns.getChildren().forEach((enemy) => {
        if ((enemy as WorldNpc).id === id) enemy.destroy();
      });
    });

    this.socket.on("playerMoved", (playerInfo: ServerWorldUnit) => {
      if (playerInfo.id === this.player.id) {
        this.player.moveToPosition(playerInfo.indX, playerInfo.indY);
      } else {
        this.otherPlayers.forEach((otherPlayer) => {
          if (playerInfo.id === otherPlayer.id) {
            otherPlayer.moveToPosition(playerInfo.indX, playerInfo.indY);
          }
        });
      }
    });

    this.socket.on("npcMoved", (npcInfo: ServerWorldUnit) => {
      this.spawns.getChildren().forEach((npc) => {
        let myNpc = npc as WorldNpc;
        if (npcInfo.id === myNpc.id) {
          myNpc.moveToPosition(npcInfo.indX, npcInfo.indY);
        }
      });
    });

    this.socket.on("npcHidden", (npcId: string) => {
      this.spawns.getChildren().forEach((npc) => {
        let myNpc = npc as WorldNpc;
        if (npcId === myNpc.id) {
          // hide and deactivate npc temporarily
          myNpc.setActive(false).setVisible(false).body.enable = false;
        }
      });
    });

    // when a battle starts, show the shield to join battle
    this.socket.on("addBattleIcon", (npc: ServerWorldUnit) => {
      const battleIcon = new BattleIcon(
        this,
        npc.id,
        this.map.tileToWorldX(npc.indX),
        this.map.tileToWorldY(npc.indY),
        "player",
        this.npcBattleShieldFrame
      );
      this.battleIcons.push(battleIcon);
      this.add.existing(battleIcon).setScale(this.unitScale);
      battleIcon.setInteractive();

      battleIcon.on("pointerup", () => {
        this.socket.emit("playerClickedBattleIcon", npc.id);
      });
    });

    // when a battle preparation phase is over, remove the shield
    this.socket.on("removeBattleIcon", (enemyId: string) => {
      this.battleIcons.find((icon) => icon.id === enemyId).destroy();
    });

    this.socket.on("npcWonFight", (npcId: string) => {
      this.spawns.getChildren().forEach((npc) => {
        let myNpc = npc as WorldNpc;
        if (npcId === myNpc.id) {
          // show npc again
          myNpc.setActive(true).setVisible(true).body.enable = true;
        }
      });
    });

    this.socket.on(
      "battleHasStarted",
      (
        allies: ServerUnit[],
        enemies: ServerUnit[],
        timeline: ServerUnit[],
        mapName: string
      ) => {
        // shake the world
        this.cameras.main.shake(300);
        // start battle
        this.time.addEvent({
          delay: 300,
          callback: () => {
            this.resetScene();
            this.scene.start("BattleScene", {
              alliesInfo: allies,
              enemiesInfo: enemies,
              timeline: timeline,
              mapName: mapName,
            });
          },
          callbackScope: this,
        });
      }
    );
  }

  initSocket() {
    if (!this.socket) {
      this.socket = io();
    }
  }

  addOtherPlayers(playerInfo: ServerWorldUnit) {
    const playerData = this.findUnitDataByName(playerInfo.type);
    const otherPlayer = new WorldOnlinePlayer(
      this,
      playerInfo.id,
      playerInfo.indX,
      playerInfo.indY,
      "player",
      playerData.frame,
      playerInfo.type
    );
    otherPlayer.tint = playerInfo.tint;
    otherPlayer.scale = this.unitScale;
    otherPlayer.changeDirection(playerInfo.direction);
    this.add.existing(otherPlayer);
    this.otherPlayers.push(otherPlayer);

    if (!this.anims.exists("left" + playerInfo.type)) {
      this.createAnimations(
        playerData.frame,
        this.animFramerate,
        otherPlayer.type
      );
    }
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

  private addPlayer(playerInfo: ServerWorldUnit) {
    let playerPosX = playerInfo.indX;
    let playerPosY = playerInfo.indY;
    // find unit data from its name given by server
    const playerData = this.findUnitDataByName(playerInfo.type);
    this.player = new WorldOnlinePlayer(
      this,
      playerInfo.id,
      playerPosX,
      playerPosY,
      "player",
      playerData.frame,
      playerData.name
    );
    this.player.tint = playerInfo.tint;
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

  private findUnitDataByName(playerName: string) {
    return unitsAvailable.find((unitData) => unitData.name === playerName);
  }

  private createTilemap() {
    this.map = this.make.tilemap({ key: "map" });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;
    this.tileset = this.map.addTilesetImage("forest_tilemap", "tiles");
    this.background = this.map
      .createLayer("calque_background", this.tileset!, 0, 0)
      .setVisible(false);
    this.obstacles = this.map
      .createLayer("calque_obstacles", this.tileset!, 0, 0)
      .setVisible(false);
    // layer for tall items appearing on top of the player like trees
    this.devantJoueur = this.map
      .createLayer("calque_devant_joueur", this.tileset!, 0, 0)
      .setDepth(9999)
      .setVisible(false);
  }

  private addEnemies(enemies: ServerWorldUnit[]) {
    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
    });

    for (let i = 0; i < enemies.length; i++) {
      const myEnemyData = enemies[i];
      const indX = myEnemyData.indX;
      const indY = myEnemyData.indY;
      const enemyType = myEnemyData.type;
      const id = myEnemyData.id;

      // find enemy data from its type
      const enemyData = this.findUnitDataByName(enemyType);

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
      myEnemy.tint = myEnemyData.tint;

      // hide npc if it's currently in a fight
      if (!myEnemyData.isVisible) {
        myEnemy.setActive(false).setVisible(false).body.enable = false;
      }
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
    if (!this.battleHasStarted && player.isMoving) {
      this.battleHasStarted = true;
      this.socket.emit("startBattle", enemy.id);
    }
  }

  resetScene() {
    this.spawns.clear(true, true);
    this.otherPlayers.forEach((player) => {
      player.destroy(true);
    });
    this.otherPlayers = [];
  }

  enableMovingOnClick(
    background: Phaser.Tilemaps.TilemapLayer,
    obstacles: Phaser.Tilemaps.TilemapLayer
  ) {
    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        const { worldX, worldY } = pointer;
        const targetVec = background.worldToTileXY(worldX, worldY);
        if (
          background.getTileAt(targetVec.x, targetVec.y) &&
          !obstacles.getTileAt(targetVec.x, targetVec.y)
        ) {
          this.socket.emit("playerMovement", {
            indX: targetVec.x,
            indY: targetVec.y,
          });
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
