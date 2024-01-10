import Phaser from "phaser";
import { WorldNpc } from "../classes/world/WorldNpc";
import { unitsAvailable } from "../data/UnitData";
import { Socket, io } from "socket.io-client";
import {
  ServerBattleIcon,
  ServerWorldUnit,
} from "../../server/scenes/ServerWorldScene";
import { WorldOnlinePlayer } from "../classes/world/WorldOnlinePlayer";
import { BattleIcon } from "../classes/world/BattleIcon";
import { ServerUnit } from "../../server/classes/ServerUnit";
import { WorldUnit } from "../classes/world/WorldUnit";
import { NpcData } from "../data/NpcData";

interface UnitPosition {
  indX: number;
  indY: number;
  type: string;
  id: number;
}

export class WorldScene extends Phaser.Scene {
  unitScale = 1.5;
  animFramerate = 7;
  npcBattleIconFrame = 54;
  teamABattleIconFrame = 56;
  teamBBattleIconFrame = 55;
  isBattleActivated = true;

  player: WorldOnlinePlayer;
  spawns: Phaser.Physics.Arcade.Group;
  battleIcons: BattleIcon[] = [];

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
  npcs: NpcData[];
  devantJoueur: Phaser.Tilemaps.TilemapLayer;
  selectedUnit: WorldUnit;

  constructor() {
    super({
      key: "WorldScene",
    });
  }

  create(data: any): void {
    this.npcs = data.npcs;
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
        // @ts-ignore
        location.reload(true);
      }, 500);
    });

    this.socket.on("newPlayer", (playerInfo: ServerWorldUnit) => {
      this.addOtherPlayer(playerInfo);
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
          this.addStaticNpcs(this.npcs);
          this.enableMovingOnClick();
        } else {
          this.addOtherPlayer(player);
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

    this.socket.on("currentBattleIcons", (battleIcons: ServerBattleIcon[]) => {
      this.addBattleIconsFromServerInfo(battleIcons);
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

    // when a battle starts, show the icon to join battle
    this.socket.on("addBattleIcon", (npc: ServerWorldUnit, id: string) => {
      this.addBattleIconFromPositionAndId(npc.indX, npc.indY, id, false, true);
    });

    // when a challenge starts, show the icons to join either team
    this.socket.on(
      "addChallengeBattleIcons",
      (
        player: ServerWorldUnit,
        challengedPlayer: ServerWorldUnit,
        playerBattleIconId,
        challengedPlayerBattleIconId
      ) => {
        this.addBattleIconFromPositionAndId(
          player.indX,
          player.indY,
          playerBattleIconId,
          true,
          true
        );
        this.addBattleIconFromPositionAndId(
          challengedPlayer.indX,
          challengedPlayer.indY,
          challengedPlayerBattleIconId,
          true,
          false
        );
      }
    );

    // when a battle's preparation phase is over, remove the icon(s)
    this.socket.on("removeBattleIcon", (id: string) => {
      const myBattleIcon = this.battleIcons.find((icon) => icon.id === id);
      if (myBattleIcon) myBattleIcon.destroy();
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
        teamA: ServerUnit[],
        teamB: ServerUnit[],
        timeline: ServerUnit[],
        mapName: string
      ) => {
        this.scene.stop("DialogScene");
        // shake the world
        this.cameras.main.shake(300);
        // start battle
        this.time.addEvent({
          delay: 300,
          callback: () => {
            this.resetScene();
            this.scene.start("BattleScene", {
              teamAInfo: teamA,
              teamBInfo: teamB,
              timeline: timeline,
              mapName: mapName,
            });
          },
          callbackScope: this,
        });
      }
    );
  }

  addStaticNpcs(npcs: NpcData[]) {
    npcs.forEach((npcData) => {
      this.add
        .existing(
          new WorldNpc(
            this,
            null,
            npcData.indX,
            npcData.indY,
            "player",
            npcData.frame,
            npcData.name,
            0xffffff,
            npcData.dialog,
            npcData.imageKey
          )
        )
        .setScale(this.unitScale)
        .setInteractive()
        .makeUnitName()
        .makeTalkOption()
        .activateSelectEvents();
    });
  }

  private addBattleIconFromPositionAndId(
    indX: number,
    indY: number,
    id: string,
    isChallenge: boolean,
    isTeamA: boolean
  ) {
    let battleIconFrame: number;
    if (!isChallenge) {
      battleIconFrame = this.npcBattleIconFrame;
    } else {
      battleIconFrame = isTeamA
        ? this.teamABattleIconFrame
        : this.teamBBattleIconFrame;
    }
    const battleIcon = new BattleIcon(
      this,
      id,
      this.map.tileToWorldX(indX),
      this.map.tileToWorldY(indY),
      "player",
      battleIconFrame
    );
    this.battleIcons.push(battleIcon);
    this.add
      .existing(battleIcon)
      .setScale(this.unitScale)
      .setInteractive()
      .setDepth(10000);

    battleIcon.on("pointerup", () => {
      this.socket.emit("playerClickedBattleIcon", id);
    });
  }

  addBattleIconsFromServerInfo(battleIcons: ServerBattleIcon[]) {
    battleIcons.forEach((battleIcon) => {
      this.addBattleIconFromPositionAndId(
        battleIcon.indX,
        battleIcon.indY,
        battleIcon.id,
        battleIcon.isChallenge,
        battleIcon.isTeamA
      );
    });
  }

  initSocket() {
    if (!this.socket) {
      this.socket = io();
    }
  }

  addOtherPlayer(serverWorldUnit: ServerWorldUnit) {
    const playerData = this.findUnitDataByName(serverWorldUnit.type);
    const otherPlayer = new WorldOnlinePlayer(
      this,
      serverWorldUnit.id,
      serverWorldUnit.indX,
      serverWorldUnit.indY,
      "player",
      playerData.frame,
      serverWorldUnit.type,
      serverWorldUnit.tint
    );
    this.add
      .existing(otherPlayer)
      .setTint(serverWorldUnit.tint)
      .setScale(this.unitScale)
      .setInteractive()
      .changeDirection(serverWorldUnit.direction)
      .activateSelectEvents()
      .makeChallengeOption()
      .makeUnitName();
    this.otherPlayers.push(otherPlayer);

    if (!this.anims.exists("left" + serverWorldUnit.type)) {
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
      playerData.name,
      playerInfo.tint
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
        enemyType,
        myEnemyData.tint
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
    if (this.isBattleActivated && !this.battleHasStarted && player.isMoving) {
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

  enableMovingOnClick() {
    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        const { worldX, worldY } = pointer;
        const targetVec = this.background.worldToTileXY(worldX, worldY);
        if (
          this.background.getTileAt(targetVec.x, targetVec.y) &&
          !this.obstacles.getTileAt(targetVec.x, targetVec.y) &&
          !this.isPlayerThere(targetVec.x, targetVec.y) &&
          !this.isNpcThere(targetVec.x, targetVec.y)
        ) {
          this.unselectCurrentUnit();
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

  unselectCurrentUnit() {
    if (this.selectedUnit) {
      this.selectedUnit.unSelectUnit();
    }
  }

  isNpcThere(indX: number, indY: number) {
    return this.npcs.some((npc) => npc.indX === indX && npc.indY === indY);
  }

  isPlayerThere(indX: number, indY: number) {
    return this.otherPlayers.some(
      (player) => player.indX === indX && player.indY === indY
    );
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

  startChallenge(unit: WorldUnit) {
    if (unit && !this.battleHasStarted) {
      this.battleHasStarted = true;
      this.socket.emit("startChallenge", unit.id);
    }
  }

  startDialog(npc: WorldNpc) {
    if (!this.battleHasStarted) {
      this.unselectCurrentUnit();
      this.scene.launch("DialogScene", {
        dialogData: npc.dialogData,
        imageKey: npc.illustrationKey,
        characterName: npc.name,
      });
    }
  }
}
