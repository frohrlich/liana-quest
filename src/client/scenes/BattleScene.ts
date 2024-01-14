import Phaser from "phaser";
import { Unit } from "../classes/battle/Unit";
import findPath from "../utils/findPath";
import { Npc } from "../classes/battle/Npc";
import { Player } from "../classes/battle/Player";
import { Spell } from "../classes/battle/Spell";
import { UIScene } from "./UIScene";
import isVisible from "../utils/lineOfSight";
import { unitsAvailable } from "../data/UnitData";
import { heal, javelin, punch, sting } from "../data/SpellData";
import { WorldScene } from "./WorldScene";
import { ServerUnit } from "../../server/classes/ServerUnit";
import { Socket } from "socket.io-client";
import { Position } from "../../server/scenes/ServerWorldScene";
import { EffectOverTime } from "../classes/battle/EffectOverTime";

// Store a tile and the path to it
export interface TilePath {
  pos: Phaser.Math.Vector2;
  path: Phaser.Math.Vector2[];
}

export class BattleScene extends Phaser.Scene {
  fontSize: 8;
  animFramerate: number = 5;

  currentPlayer: Player;
  teamA: Unit[] = [];
  teamB: Unit[] = [];
  units: Unit[] = [];
  clickedTile: Phaser.Tilemaps.Tile | null;
  tileWidth: number;
  tileHeight: number;
  map: Phaser.Tilemaps.Tilemap;
  direction: string;
  tileset: Phaser.Tilemaps.Tileset | null;
  obstacles: Phaser.Tilemaps.TilemapLayer | null;
  background: Phaser.Tilemaps.TilemapLayer | null;
  timelineIndex: number;
  timeline: Unit[] = [];
  isPlayerTurn: boolean;
  accessibleTiles: TilePath[] = [];
  spellVisible: boolean;
  spellRange: Phaser.Tilemaps.Tile[] = [];
  currentSpell: Spell;
  uiScene: UIScene;
  overlays: Phaser.GameObjects.Rectangle[] = [];
  spellAoeOverlay: Phaser.GameObjects.Rectangle[] = [];
  pathOverlay: Phaser.GameObjects.Rectangle[] = [];
  grid: Phaser.GameObjects.Grid;
  teamAStarterTiles: Phaser.Tilemaps.Tile[];
  teamBStarterTiles: Phaser.Tilemaps.Tile[];
  worldScene: WorldScene;
  socket: Socket;
  playerId: string;
  isInPreparationPhase: boolean;

  constructor() {
    super({
      key: "BattleScene",
    });
  }

  create(data: any): void {
    this.isInPreparationPhase = true;
    this.isPlayerTurn = false;
    this.worldScene = this.scene.get("WorldScene") as WorldScene;
    this.socket = this.worldScene.socket;
    this.socket.off();
    this.socket.on("disconnect", () => {
      setTimeout(() => {
        // @ts-ignore
        location.reload(true);
      }, 500);
    });
    this.playerId = this.socket.id;

    // refresh scene to its original state
    this.timelineIndex = 0;
    this.spellVisible = false;

    this.createTilemap(data);
    this.addUnitsOnStart(data);

    // camera settings
    const zoom = 2;
    this.setupCamera(zoom);

    // game grid
    this.addGrid(zoom);

    this.addSpellUnselectListener();

    // create the timeline
    this.syncTimelineWithServer(data.timeline);

    // clean up event listener on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });

    // start UI
    this.scene.run("UIScene");
    this.uiScene = this.scene.get("UIScene") as UIScene;

    // and finally, player gets to choose their starter position
    this.setupStartPosition();

    this.addDisconnectListener();
  }

  addDisconnectListener() {
    this.socket.on("playerLeft", (playerId: string, timeline: ServerUnit[]) => {
      const index = this.timeline.findIndex((unit) => unit.id === playerId);
      if (index !== -1) {
        if (this.timelineIndex > index) this.timelineIndex--;
        this.timeline[index].die();
      }
      this.syncTimelineWithServer(timeline);
      this.uiScene.updateTimeline(this.timeline, this.isInPreparationPhase);
    });
  }

  // add event listener for spell unselect when clicking outside spell range
  private addSpellUnselectListener() {
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        // continue only if player turn and not already moving
        if (!this.currentPlayer.isMoving && this.isPlayerTurn) {
          const { worldX, worldY } = pointer;

          const targetVec = this.background!.worldToTileXY(worldX, worldY);

          // if in spell mode
          if (this.spellVisible) {
            // if cliked outside spell range, unselect spell and go back to movement mode
            if (
              !this.spellRange.some((tile) => {
                return tile.x == targetVec.x && tile.y == targetVec.y;
              })
            ) {
              this.clearSpellRange();
              this.highlightAccessibleTiles(this.accessibleTiles);
            }
          }
        }
      }
    );
  }

  private addGrid(zoom: number) {
    this.grid = this.add.grid(
      0,
      0,
      this.map.widthInPixels * zoom,
      this.map.heightInPixels * zoom,
      this.map.tileWidth,
      this.map.tileHeight,
      0xffffff,
      0,
      0x000000,
      0.1
    );
  }

  private setupCamera(zoom: number) {
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.roundPixels = true;
  }

  setupStartPosition() {
    const teamAColor = 0x0000ff;
    const teamBColor = 0xff0000;

    // allies starter tiles are interactive, enemies starter tiles are not
    const isPlayerInTeamA = this.teamA.some(
      (unit) => unit.id === this.socket.id
    );
    const alliedStarterTiles = isPlayerInTeamA
      ? this.teamAStarterTiles
      : this.teamBStarterTiles;
    const enemyStarterTiles = isPlayerInTeamA
      ? this.teamBStarterTiles
      : this.teamAStarterTiles;
    const alliedColor = isPlayerInTeamA ? teamAColor : teamBColor;
    const enemyColor = isPlayerInTeamA ? teamBColor : teamAColor;

    alliedStarterTiles.forEach((tile) => {
      // overlay the tiles with an interactive transparent rectangle
      let overlay = this.generateStarterOverlay(tile, alliedColor);
      // on click, teleport to new starter position
      this.addStartingOverlayInteractivity(overlay, tile);
    });

    enemyStarterTiles.forEach((tile) => {
      let overlay = this.generateStarterOverlay(tile, enemyColor);
      this.overlays.push(overlay);
    });

    this.listenToPreparationPhaseEvents();
  }

  private addStartingOverlayInteractivity(
    overlay: Phaser.GameObjects.Rectangle,
    tile: Phaser.Tilemaps.Tile
  ) {
    overlay.on("pointerup", () => {
      if (!this.isUnitThere(tile.x, tile.y)) {
        this.currentPlayer.teleportToPosition(tile.x, tile.y);
        this.socket.emit("playerChangedStartPosition", this.playerId, {
          indX: tile.x,
          indY: tile.y,
        });
      }
    });
    overlay.on("pointerover", () => {
      tile.tint = 0x0000ff;
    });
    overlay.on("pointerout", () => {
      tile.tint = 0xffffff;
    });
  }

  private generateStarterOverlay(
    tile: Phaser.Tilemaps.Tile,
    alliedColor: number
  ) {
    let overlay = this.add.rectangle(
      tile.pixelX + 0.5 * tile.width,
      tile.pixelY + 0.5 * tile.height,
      tile.width,
      tile.height,
      alliedColor,
      0.4
    );
    overlay.setInteractive();
    this.overlays.push(overlay);
    return overlay;
  }

  private listenToPreparationPhaseEvents() {
    this.socket.on("battleIsWon", () => {
      this.endBattle();
    });

    this.socket.on("battleIsLost", () => {
      this.gameOver();
    });

    this.socket.on(
      "playerHasChangedStartPosition",
      (playerId: string, position: Position) => {
        const myPlayer = this.findUnitById(playerId);
        if (myPlayer) {
          if (this.currentPlayer.id === playerId) {
            // if player position incoherent with server state, reconcile
            if (
              position.indX !== myPlayer.indX ||
              position.indY !== myPlayer.indY
            ) {
              this.currentPlayer.teleportToPosition(
                position.indX,
                position.indY
              );
            }
          } else {
            myPlayer.teleportToPosition(position.indX, position.indY);
          }
        }
      }
    );

    this.socket.on(
      "playerJoinedBattle",
      (newPlayer: ServerUnit, timeline: ServerUnit[]) => {
        this.addUnit(newPlayer, newPlayer.isTeamA);
        this.syncTimelineWithServer(timeline);
        this.uiScene.updateTimeline(this.timeline, true);
      }
    );

    this.socket.on("playerIsReady", (player: ServerUnit) => {
      const myUnit = this.findUnitById(player.id);
      if (myUnit) {
        myUnit.addReadyIcon();
      }
    });

    this.socket.on("playerIsNotReady", (player: ServerUnit) => {
      const myUnit = this.findUnitById(player.id);
      if (myUnit) {
        myUnit.removeReadyIcon();
      }
    });

    this.socket.on("startMainBattlePhase", () => {
      this.startBattle();
    });

    this.socket.on("readyIsConfirmed", () => {
      this.uiScene.setButtonToReady();
    });

    this.socket.on("notReadyIsConfirmed", () => {
      this.uiScene.setButtonToNotReady();
    });
  }

  clearAllTilesTint() {
    this.background.forEachTile((tile) => (tile.tint = 0xffffff));
  }

  syncTimelineWithServer(timeline: ServerUnit[]) {
    this.timeline = [];
    timeline.forEach((unit) => {
      const myUnit = this.findUnitById(unit.id);
      if (myUnit) {
        this.timeline.push(myUnit);
      }
    });
  }

  findUnitById(id: string) {
    return this.units.find((unit) => unit.id === id);
  }

  private calculatePlayerStarterTiles() {
    this.teamAStarterTiles = this.background.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => !this.obstacles.getTileAt(tile.x, tile.y),
      this,
      0,
      0,
      this.map.width / 3,
      this.map.height
    );
  }

  private calculateEnemyStarterTiles() {
    this.teamBStarterTiles = this.background.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => !this.obstacles.getTileAt(tile.x, tile.y),
      this,
      Math.floor((this.map.width * 2) / 3),
      0,
      this.map.width / 3,
      this.map.height
    );
  }

  displayBattleStartScreen() {
    const screenCenterX = this.cameras.main.displayWidth / 2;
    const screenCenterY = this.cameras.main.displayHeight / 2;
    const battleStartText = "The battle begins !";
    const battleStart = this.add
      .bitmapText(
        screenCenterX,
        screenCenterY,
        "dogicapixel",
        battleStartText,
        this.fontSize * 8
      )
      .setOrigin(0.5)
      .setScale(3)
      .setDepth(99999);
    const battleStartOverlay = this.add
      .rectangle(
        0,
        0,
        this.cameras.main.displayWidth,
        this.cameras.main.displayHeight,
        0x999999,
        0.7
      )
      .setOrigin(0)
      .setDepth(99998);

    this.time.addEvent({
      delay: 1500,
      callback: () => {
        battleStart.destroy();
        battleStartOverlay.destroy();
      },
      callbackScope: this,
    });
  }

  // play this after player chose starter position and pressed start button
  playerClickedReadyButton() {
    this.socket.emit("playerClickedReadyButton", this.socket.id);
  }

  startBattle() {
    this.isInPreparationPhase = false;
    this.clearOverlay();
    this.removeReadyIcons();
    this.teamBStarterTiles = [];
    this.teamAStarterTiles = [];
    this.uiScene.startBattle();
    this.listenToMainBattleEvents();
    this.displayBattleStartScreen();
  }

  removeReadyIcons() {
    this.units.forEach((unit) => {
      unit.removeReadyIcon();
    });
  }

  listenToMainBattleEvents() {
    this.socket.on(
      "unitTurnBegins",
      (
        serverUnit: ServerUnit,
        effectOverTime: EffectOverTime,
        turnIndex: number
      ) => {
        const myUnit = this.findUnitById(serverUnit.id);
        if (myUnit) {
          myUnit.synchronizeWithServerUnit(serverUnit);
          myUnit.undergoEffectOverTime(effectOverTime);

          if (!myUnit.isDead()) {
            this.changeTimelineIndex(turnIndex);
            if (myUnit instanceof Player) {
              this.startPlayerTurn(myUnit);
            }
          }
        }
      }
    );

    this.socket.on(
      "unitMoved",
      (serverUnit: ServerUnit, path: Phaser.Math.Vector2[]) => {
        const myUnit = this.findUnitById(serverUnit.id);
        if (myUnit) {
          myUnit.moveAlong(path);
          myUnit.synchronizeWithServerUnit(serverUnit);
          this.uiScene.refreshUI();
        }
      }
    );

    this.socket.on(
      "unitHasCastSpell",
      (
        serverUnit: ServerUnit,
        timeline: ServerUnit[],
        spell: Spell,
        targetVec: Phaser.Math.Vector2,
        affectedUnits: ServerUnit[],
        summonedUnit: ServerUnit
      ) => {
        const myUnit = this.findUnitById(serverUnit.id);
        if (myUnit) {
          if (
            myUnit.indX !== serverUnit.indX ||
            myUnit.indY !== serverUnit.indY
          ) {
            myUnit.moveDirectlyToNewPosition(serverUnit.indX, serverUnit.indY);
          }
          myUnit.synchronizeWithServerUnit(serverUnit);
          myUnit.castSpell(
            spell,
            targetVec,
            affectedUnits,
            summonedUnit,
            timeline
          );
        }
      }
    );

    this.socket.on("endPlayerTurn", (serverUnit: ServerUnit) => {
      const myUnit = this.findUnitById(serverUnit.id);
      if (myUnit) {
        myUnit.synchronizeWithServerUnit(serverUnit);
        // in case something went wrong...
        myUnit.teleportToPosition(serverUnit.indX, serverUnit.indY);
        if (myUnit instanceof Player) {
          myUnit.endTurnAfterServerConfirmation(serverUnit);
          this.isPlayerTurn = false;
        }
      }
    });
  }

  changeTimelineIndex = (timelineIndex: number) => {
    // clear previous player highlight on the timeline
    let prevPlayer = this.timeline[this.timelineIndex];
    if (prevPlayer) {
      this.uiScene.uiTimelineBackgrounds[this.timelineIndex].fillColor =
        prevPlayer.isTeamA ? 0x0000ff : 0xff0000;
    }

    this.timelineIndex = timelineIndex;
    this.highlightCurrentUnitInTimeline();
  };

  private addUnitsOnStart(data: any) {
    this.calculatePlayerStarterTiles();
    this.calculateEnemyStarterTiles();

    // allies
    this.addTeamOnStart(data, true);
    // enemies
    this.addTeamOnStart(data, false);

    this.currentPlayer = this.findUnitById(this.socket.id) as Player;
  }

  private addTeamOnStart(data: any, isTeamA: boolean) {
    const unitsInfo = isTeamA ? data.teamAInfo : data.teamBInfo;
    unitsInfo.forEach((serverUnit: ServerUnit) => {
      this.addUnit(serverUnit, isTeamA);
    });
  }

  clearAllUnits() {
    this.units.forEach((unit) => {
      unit.destroyUnit();
    });
    this.units = [];
    this.timeline = [];
    this.teamA = [];
    this.teamB = [];
  }

  private createTilemap(data: any) {
    this.map = this.make.tilemap({ key: data.mapName });

    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // get the tileset
    this.tileset = this.map.addTilesetImage(
      this.worldScene.mapName + "_tilemap",
      this.worldScene.mapName + "_tiles"
    );

    // create layers
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
    let overPlayer = this.map.createLayer(
      "calque_devant_joueur",
      this.tileset!,
      0,
      0
    );
    // always on top
    overPlayer?.setDepth(9999);
    // transparent to see player beneath tall items
    overPlayer?.setAlpha(0.5);
  }

  private startPlayerTurn(player: Player) {
    this.currentPlayer = player;
    this.uiScene.startPlayerTurn();
    this.isPlayerTurn = true;
    this.refreshAccessibleTiles();
    this.highlightAccessibleTiles(this.accessibleTiles);
  }

  private highlightCurrentUnitInTimeline() {
    this.uiScene.uiTimelineBackgrounds[this.timelineIndex].fillColor = 0xffffff;
  }

  // checks if the unit can access this tile with their remaining PMs
  // if there is a path, return it
  getPathToPosition(
    x: number,
    y: number,
    unitX: number,
    unitY: number,
    pm: number
  ) {
    const startVec = new Phaser.Math.Vector2(unitX, unitY);
    const targetVec = new Phaser.Math.Vector2(x, y);
    // pathfinding
    const path = findPath(
      startVec,
      targetVec,
      this.background!,
      this.obstacles!
    );
    if (path && path.length > 0 && path.length <= pm) {
      return path;
    } else {
      return false;
    }
  }

  // highlight tiles accessible to the player
  // and make them interactive
  highlightAccessibleTiles = (positions: TilePath[]) => {
    let baseColor = 0xffffff;
    positions.forEach((tilePos) => {
      let tile = this.background?.getTileAt(tilePos.pos.x, tilePos.pos.y);
      // overlay the tile with an interactive transparent rectangle
      let overlay = this.add.rectangle(
        tile.pixelX + 0.5 * tile.width,
        tile.pixelY + 0.5 * tile.height,
        tile.width,
        tile.height,
        baseColor,
        0.4
      );
      overlay.setInteractive();
      this.overlays.push(overlay);

      // on clicking on a tile, move
      overlay.on("pointerup", () => {
        if (!this.currentPlayer.isMoving) {
          this.socket.emit("playerMove", tilePos.pos);
        }
      });
      // on hovering over a tile, display path to it
      overlay.on("pointerover", () => {
        if (!this.currentPlayer.isMoving) this.highlightPath(tilePos.path);
      });
      overlay.on("pointerout", () => {
        if (!this.currentPlayer.isMoving) this.clearPathHighlight();
      });
    });
  };

  // highlight tiles on a path
  highlightPath(path: Phaser.Math.Vector2[]) {
    let highlightColor = 0xffffff;
    path.forEach((position) => {
      let pos = this.background!.tileToWorldXY(position.x, position.y);
      this.pathOverlay.push(
        this.add.rectangle(
          pos.x + 0.5 * this.tileWidth,
          pos.y + 0.5 * this.tileHeight,
          this.tileWidth,
          this.tileHeight,
          highlightColor,
          0.5
        )
      );
    });
  }

  clearPathHighlight() {
    this.pathOverlay.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.pathOverlay = [];
  }

  // calculate the accessible tiles around a position with a pm radius
  // also store the path to each tile
  calculateAccessibleTiles = (
    pos: Phaser.Math.Vector2,
    pm: number
  ): TilePath[] => {
    const { x, y } = pos;
    let tablePos: TilePath[] = [];
    const tilesAround = this.background?.getTilesWithin(
      x - pm,
      y - pm,
      pm * 2 + 1,
      pm * 2 + 1
    );
    if (tilesAround) {
      tilesAround.forEach((tile) => {
        const isPlayerTile = tile.x == x && tile.y == y;
        const distance = Math.abs(tile.x - pos.x) + Math.abs(tile.y - pos.y);
        let path;
        if (!isPlayerTile && pm >= distance) {
          path = this.getPathToPosition(tile.x, tile.y, x, y, pm);
        }
        if (path && path.length > 0) {
          let myPos: TilePath = {
            path: path,
            pos: new Phaser.Math.Vector2(tile.x, tile.y),
          };
          tablePos.push(myPos);
        }
      });
    }
    return tablePos;
  };

  // refresh the accessible tiles around the player
  refreshAccessibleTiles() {
    this.accessibleTiles = this.calculateAccessibleTiles(
      new Phaser.Math.Vector2(this.currentPlayer.indX, this.currentPlayer.indY),
      this.currentPlayer.pm
    );
  }

  // clear highlighted tiles
  clearAccessibleTiles = () => {
    this.clearOverlay();
    this.clearPathHighlight();
  };

  // add a unit to the scene
  addUnit(serverUnit: ServerUnit, isTeamA: boolean) {
    // see if we find a unit with the name given by the world scene in the array
    // of all available units
    const unitData = unitsAvailable.find(
      (unitData) => unitData.name === serverUnit.type
    );
    if (unitData) {
      const isPlayable = serverUnit.id === this.socket.id;
      const key = "player";
      let unit: Unit;
      if (!isPlayable) {
        unit = new Npc(
          this,
          0,
          0,
          key,
          serverUnit.tint,
          unitData.frame,
          serverUnit.indX,
          serverUnit.indY,
          serverUnit.pm,
          serverUnit.pa,
          serverUnit.hp,
          isTeamA
        );
      } else {
        unit = new Player(
          this,
          0,
          0,
          key,
          serverUnit.tint,
          unitData.frame,
          serverUnit.indX,
          serverUnit.indY,
          serverUnit.pm,
          serverUnit.pa,
          serverUnit.hp,
          isTeamA
        );
      }
      unit.type = unitData.name;
      unit.id = serverUnit.id;
      unit.tint = serverUnit.tint;
      this.add.existing(unit);

      // create unit animations with base sprite and framerate
      if (!this.anims.exists("left" + unitData.name)) {
        this.createAnimations(
          unitData.frame,
          this.animFramerate,
          unitData.name
        );
      }

      // set unit start position
      let initialUnitX = unit.tilePosToPixelsX(serverUnit.indX);
      let initialUnitY = unit.tilePosToPixelsY(serverUnit.indY);
      unit.setPosition(initialUnitX, initialUnitY);
      const unitScale = 1.5;
      unit.setScale(unitScale);
      if (isTeamA) {
        this.teamA.push(unit);
      } else {
        this.teamB.push(unit);
      }
      this.units.push(unit);
      // add spells
      unit.addSpells.apply(unit, this.decodeSpellString(unitData.spells));
      // unit is now considered as an obstacle for other units
      this.addToObstacleLayer(new Phaser.Math.Vector2(unit.indX, unit.indY));
      // initialize health bar
      unit.updateHealthBar();
      unit.depth = unit.y;
      // create blue or red circle under unit's feet to identify its team
      unit.createTeamIdentifier(unitScale);
      // add ready icon if a player is ready to fight
      if (serverUnit.isReady && serverUnit.isPlayable) unit.addReadyIcon();
      unit.setInteractive();
      return unit;
    } else {
      throw new Error("Error : unit not found");
    }
  }

  // transform a list of spell names in a string into an array of Spell objects
  decodeSpellString(spellStr: string) {
    let spellArray: Spell[] = [];
    spellStr.split(", ").forEach((spellName) => {
      switch (spellName) {
        case "deadly javelin":
          spellArray.push(javelin);
          break;
        case "punch":
          spellArray.push(punch);
          break;
        case "sting":
          spellArray.push(sting);
          break;
        case "herbal medicine":
          spellArray.push(heal);
          break;
        default:
          break;
      }
    });
    return spellArray;
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

  // remove a unit from the obstacle layer
  removeFromObstacleLayer(indX: number, indY: number) {
    this.obstacles.removeTileAt(indX, indY);
  }

  removeUnitFromBattle(unit: Unit) {
    this.removeFromObstacleLayer(unit.indX, unit.indY);
    this.removeUnitFromTeam(unit);
    this.refreshAccessibleTiles();
    if (this.isPlayerTurn) {
      if (this.spellVisible) {
        this.clearSpellRange();
        this.displaySpellRange(this.currentSpell);
      } else {
        this.clearAccessibleTiles();
        this.refreshAccessibleTiles();
        this.highlightAccessibleTiles(this.accessibleTiles);
      }
    }
  }

  removeUnitFromTeam(unit: Unit) {
    const teamArray = unit.isTeamA ? this.teamA : this.teamB;
    const index = teamArray.findIndex((unit) => unit == unit);
    if (index !== -1) {
      teamArray.splice(index, 1);
    }
  }

  // add a position to the obstacle layer
  addToObstacleLayer(target: Phaser.Math.Vector2) {
    let targetTile = this.background?.getTileAt(target.x, target.y);
    let newObstacle = this.obstacles?.putTileAt(
      targetTile!,
      target.x,
      target.y
    );
    newObstacle?.setAlpha(0);
  }

  displaySpellRange(spell: Spell) {
    this.spellVisible = true;
    this.currentSpell = spell;
    this.spellRange = this.calculateSpellRange(this.currentPlayer, spell);
    this.createAoeZone(spell);
    let baseColor = 0x000099;
    this.spellRange.forEach((tile) => {
      if (tile) {
        // overlay the tile with an interactive transparent rectangle
        let overlay = this.add.rectangle(
          tile.pixelX + 0.5 * tile.width,
          tile.pixelY + 0.5 * tile.height,
          tile.width,
          tile.height,
          baseColor,
          0.4
        );
        overlay.setInteractive();
        this.overlays.push(overlay);
        const pos = new Phaser.Math.Vector2(tile.x, tile.y);

        this.activateSpellEvents(overlay, pos, spell, tile);

        // we want hover or click on a unit to have the same effect than hover or click on its tile
        const playerOnThisTile = this.getUnitAtPos(tile.x, tile.y);
        if (playerOnThisTile) {
          this.activateSpellEvents(playerOnThisTile, pos, spell, tile);
        }
      }
    });
  }

  activateSpellEvents(
    object: Phaser.GameObjects.GameObject,
    pos: Phaser.Math.Vector2,
    spell: Spell,
    tile: Phaser.Tilemaps.Tile
  ) {
    // on clicking on a tile, cast spell
    object.on("pointerup", () => {
      this.socket.emit("playerCastSpell", this.currentSpell, pos);
    });
    // on hovering over a tile, display aoe zone
    object.on("pointerover", () => {
      this.updateAoeZone(spell, tile.pixelX, tile.pixelY);
    });
    object.on("pointerout", () => {
      this.hideAoeZone();
    });
  }

  hideAoeZone() {
    this.spellAoeOverlay.forEach((overlay) => {
      overlay.setVisible(false);
    });
  }

  // create aoe zone but doesn't display it yet
  createAoeZone(spell: Spell) {
    const highlightColor = 0xff0099;
    const alpha = 0.6;
    switch (spell.aoe) {
      case "monoTarget":
        const overlay = this.add.rectangle(
          0,
          0,
          this.tileWidth,
          this.tileHeight,
          highlightColor,
          alpha
        );
        overlay.setVisible(false);
        this.spellAoeOverlay.push(overlay);
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        for (let i = -spell.aoeSize; i <= spell.aoeSize; i++) {
          for (let j = -spell.aoeSize; j <= spell.aoeSize; j++) {
            let distance = Math.abs(i) + Math.abs(j);
            if (distance <= spell.aoeSize) {
              const overlay = this.add.rectangle(
                0,
                0,
                this.tileWidth,
                this.tileHeight,
                highlightColor,
                alpha
              );
              overlay.setVisible(false);
              this.spellAoeOverlay.push(overlay);
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        for (let i = 0; i < spell.aoeSize; i++) {
          const overlay = this.add.rectangle(
            0,
            0,
            this.tileWidth,
            this.tileHeight,
            highlightColor,
            alpha
          );
          overlay.setVisible(false);
          this.spellAoeOverlay.push(overlay);
        }
        break;
      default:
        break;
    }
  }

  // update the position of the aoe zone, when player hovers over tile
  updateAoeZone(spell: Spell, x: number, y: number) {
    switch (spell.aoe) {
      case "monoTarget":
        const overlay = this.spellAoeOverlay[0];
        overlay.x = x + 0.5 * this.tileWidth;
        overlay.y = y + 0.5 * this.tileWidth;
        overlay.setVisible(true);
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        let target = this.background!.worldToTileXY(x, y);
        let k = 0;
        for (
          let i = target.x - spell.aoeSize;
          i <= target.x + spell.aoeSize;
          i++
        ) {
          for (
            let j = target.y - spell.aoeSize;
            j <= target.y + spell.aoeSize;
            j++
          ) {
            let distance = Math.abs(target.x - i) + Math.abs(target.y - j);
            if (distance <= spell.aoeSize) {
              let pos = this.background!.tileToWorldXY(i, j);
              const overlay = this.spellAoeOverlay[k];
              overlay.x = pos.x + 0.5 * this.tileWidth;
              overlay.y = pos.y + 0.5 * this.tileWidth;
              overlay.setVisible(true);
              k++;
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        target = this.background!.worldToTileXY(x, y);
        // true if target is aligned horizontally with player (else we assume it's aligned vertically)
        let isAlignedX = target.y == this.currentPlayer.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - this.currentPlayer.indX)
          : Math.sign(target.y - this.currentPlayer.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          const overlay = this.spellAoeOverlay[i];
          let pos = isAlignedX
            ? this.background!.tileToWorldXY(
                baseIndex + i * isForward,
                target.y
              )
            : this.background!.tileToWorldXY(
                target.x,
                baseIndex + i * isForward
              );
          overlay.x = pos.x + 0.5 * this.tileWidth;
          overlay.y = pos.y + 0.5 * this.tileWidth;
          overlay.setVisible(true);
        }
        break;

      default:
        break;
    }
  }

  clearAoeZone() {
    this.spellAoeOverlay.forEach((spellAoe) => {
      spellAoe.destroy(true);
    });
    this.spellAoeOverlay = [];
  }

  getUnitsInsideAoe(caster: Unit, indX: number, indY: number, spell: Spell) {
    const unitsInAoe: Unit[] = [];
    switch (spell.aoe) {
      case "monoTarget":
        if (this.isUnitThere(indX, indY)) {
          unitsInAoe.push(this.getUnitAtPos(indX, indY));
        }
        break;
      case "star":
        for (let i = indX - spell.aoeSize; i <= indX + spell.aoeSize; i++) {
          for (let j = indY - spell.aoeSize; j <= indY + spell.aoeSize; j++) {
            let distance = Math.abs(indX - i) + Math.abs(indY - j);
            if (distance <= spell.aoeSize) {
              if (this.isUnitThere(i, j)) {
                unitsInAoe.push(this.getUnitAtPos(i, j));
              }
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        let target = { x: indX, y: indY };
        // true if target is aligned horizontally with caster (else we assume it's aligned vertically)
        let isAlignedX = target.y == caster.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - caster.indX)
          : Math.sign(target.y - caster.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          let pos = isAlignedX
            ? {
                x: baseIndex + i * isForward,
                y: target.y,
              }
            : {
                x: target.x,
                y: baseIndex + i * isForward,
              };
          if (this.isUnitThere(pos.x, pos.y)) {
            unitsInAoe.push(this.getUnitAtPos(pos.x, pos.y));
          }
        }
        break;

      default:
        break;
    }
    return unitsInAoe;
  }

  // calculate spell range
  calculateSpellRange(unit: Unit, spell: Spell) {
    return this.background?.filterTiles(
      (tile: Phaser.Tilemaps.Tile) =>
        this.isPosAccessibleToSpell(unit, spell, tile),
      this,
      unit.indX - spell.maxRange,
      unit.indY - spell.maxRange,
      spell.maxRange * 2 + 1,
      spell.maxRange * 2 + 1
    );
  }

  // return true if tile is visible for a given unit and spell
  isPosAccessibleToSpell(unit: Unit, spell: Spell, tile: Phaser.Tilemaps.Tile) {
    let startVec = new Phaser.Math.Vector2(unit.indX, unit.indY);
    let targetVec = new Phaser.Math.Vector2(tile.x, tile.y);
    let distance =
      Math.abs(startVec.x - targetVec.x) + Math.abs(startVec.y - targetVec.y);
    if (
      distance <= spell.maxRange &&
      distance >= spell.minRange &&
      (!this.obstacles?.getTileAt(tile.x, tile.y) ||
        this.isUnitThere(tile.x, tile.y))
    ) {
      // if spell doesn't need line of sight we just need to ensure tile isn't an obstacle
      if (!spell.lineOfSight) return true;
      // else we use the line of sight algorithm
      else {
        // case of spells being cast in straight line only
        let isInStraightLine = true;
        if (spell.straightLine) {
          isInStraightLine = unit.indX === tile.x || unit.indY === tile.y;
        }
        return (
          isInStraightLine &&
          isVisible(startVec, targetVec, this.obstacles!, this)
        );
      }
    }
    return false;
  }

  // return true if there is a unit at the specified position
  isUnitThere(x: number, y: number): boolean {
    return this.timeline.some((unit) => unit.indX == x && unit.indY == y);
  }

  // return unit at the specified position
  getUnitAtPos(indX: number, indY: number) {
    return this.timeline.find(
      (unit) => unit.indX === indX && unit.indY === indY
    );
  }

  clearSpellRange() {
    this.spellVisible = false;
    this.uiScene.clearSpellsHighlight();
    this.clearOverlay();
    this.clearAoeZone();
    this.clearPointerEvents();
    this.clearAccessibleTiles();
  }

  clearPointerEvents() {
    this.units.forEach((unit) => {
      unit.off("pointerup");
      unit.off("pointerover");
      unit.off("pointerout");
      unit.addHoverEvents();
    });
  }

  clearOverlay() {
    this.overlays.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.overlays = [];
    this.clearAllTilesTint();
  }

  gameOver() {
    this.resetScene();
    this.scene.start("GameOverScene");
  }

  endBattle() {
    this.resetScene();
    this.scene.start("WorldScene");
  }

  resetScene() {
    this.clearSpellRange();
    this.clearAllUnits();
    this.map.destroy();
    this.grid.destroy();
    this.scene.stop("UIScene");
  }
}
