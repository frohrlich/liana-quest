import Phaser from "phaser";
import { Unit } from "../classes/Unit";
import findPath from "../utils/findPath";
import { Npc } from "../classes/Npc";
import { Player } from "../classes/Player";
import { Spell } from "../classes/Spell";
import { UIScene } from "./UIScene";
import isVisible from "../utils/lineOfSight";

export class BattleScene extends Phaser.Scene {
  player!: Unit;
  allies: Unit[] = [];
  enemies: Unit[] = [];
  clickedTile!: Phaser.Tilemaps.Tile | null;
  tileWidth!: number;
  tileHeight!: number;
  map!: Phaser.Tilemaps.Tilemap;
  direction!: string;
  tileset!: Phaser.Tilemaps.Tileset | null;
  obstacles!: Phaser.Tilemaps.TilemapLayer | null;
  background!: Phaser.Tilemaps.TilemapLayer | null;
  turnIndex: number = 0;
  timeline: Unit[] = [];
  isPlayerTurn: boolean = true;
  accessibleTiles: Phaser.Math.Vector2[] = [];
  spellVisible: boolean = false;
  spellRange: Phaser.Tilemaps.Tile[] = [];
  currentSpell!: Spell;
  uiScene!: UIScene;
  overlays: Phaser.GameObjects.Rectangle[] = [];
  spellAoeOverlay: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({
      key: "BattleScene",
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    // create tilemap and get tile dimensions
    this.map = this.make.tilemap({ key: "battlemap" });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // get the tileset
    this.tileset = this.map.addTilesetImage("forest_tilemap", "tiles");

    // create layers and characters sprites
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

    // create spells
    let javelin = new Spell(
      42,
      0,
      4,
      25,
      3,
      "Deadly Javelin",
      true,
      0,
      2,
      "star",
      2
    );
    let punch = new Spell(51, 1, 1, 55, 2, "Punch", true);
    let sting = new Spell(60, 4, 12, 15, 2, "Sting", false, 1, 1);

    // add units
    // starting position (grid index)
    let playerStartX = 5;
    let playerStartY = 6;
    let playerFrame = 6;
    this.player = this.addUnit(
      "player",
      playerFrame,
      playerStartX,
      playerStartY,
      5,
      6,
      100,
      "Amazon",
      false,
      true,
      javelin,
      punch,
      sting
    );
    // create player animations with base sprite and framerate
    this.createAnimations(playerFrame, 5, "Amazon");

    // ally 1
    playerStartX = 12;
    playerStartY = 5;
    playerFrame = 0;
    this.addUnit(
      "player",
      playerFrame,
      playerStartX,
      playerStartY,
      3,
      6,
      100,
      "Dude",
      true,
      true,
      sting
    );
    this.createAnimations(playerFrame, 5, "Dude");
    // ally 2
    playerStartX = 13;
    playerStartY = 2;
    playerFrame = 0;
    this.addUnit(
      "player",
      playerFrame,
      playerStartX,
      playerStartY,
      3,
      6,
      100,
      "Dude",
      true,
      true,
      sting
    );
    // enemy 1
    let enemyStartX = 14;
    let enemyStartY = 2;
    let enemyFrame = 30;
    this.addUnit(
      "player",
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      "Snowman",
      true,
      false,
      javelin
    );
    // enemy 2
    enemyStartX = 18;
    enemyStartY = 6;
    enemyFrame = 30;
    this.addUnit(
      "player",
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      "Snowman",
      true,
      false,
      javelin
    );
    // enemy 3
    enemyStartX = 17;
    enemyStartY = 3;
    enemyFrame = 30;
    this.addUnit(
      "player",
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      "Snowman",
      true,
      false,
      javelin
    );
    this.createAnimations(enemyFrame, 5, "Snowman");

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

    // camera settings
    let zoom = 4;
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.roundPixels = true;

    // game grid
    this.add.grid(
      0,
      0,
      (this.map.widthInPixels * zoom) / 2,
      (this.map.heightInPixels * zoom) / 2,
      this.map.tileWidth,
      this.map.tileHeight,
      0xffffff,
      0,
      0x000000,
      0.1
    );

    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        // continue only if player turn and not already moving
        if (!this.player.isMoving && this.isPlayerTurn) {
          const { worldX, worldY } = pointer;

          const startVec = new Phaser.Math.Vector2(
            this.player.indX,
            this.player.indY
          );
          const targetVec = this.background!.worldToTileXY(worldX, worldY);

          // if in spell mode, try to launch spell
          if (this.spellVisible) {
            // check if clicked tile inside spell range
            if (
              this.spellRange.some((tile) => {
                return tile.x == targetVec.x && tile.y == targetVec.y;
              })
            ) {
              this.player.castSpell(this.currentSpell, targetVec);
              this.uiScene.refreshUI();
              // if cliked outside spell range, deselect spell
            } else {
              this.clearSpellRange();
            }
            // else try to move player
          } else if (
            // check if clicked tile is accessible to player
            this.accessibleTiles.some((tile) => {
              return tile.x == targetVec.x && tile.y == targetVec.y;
            })
          ) {
            // pathfinding
            let path = findPath(
              startVec,
              targetVec,
              this.background!,
              this.obstacles!
            );

            if (!this.player.isMoving && path && path.length > 0) {
              this.player.moveAlong(path);
              this.refreshAccessibleTiles();
            }
          }
        }
      }
    );

    // create the timeline
    this.timeline = createTimeline(this.allies, this.enemies);

    // highlight the accessible tiles around the player
    let playerPos = new Phaser.Math.Vector2(this.player.indX, this.player.indY);
    this.accessibleTiles = this.calculateAccessibleTiles(
      playerPos,
      this.player.pm
    );
    this.highlightAccessibleTiles(this.accessibleTiles);

    // remember to clean up on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });

    this.scene.run("UIScene");
    this.uiScene = this.scene.get("UIScene") as UIScene;
  }

  // end unit turn (works for player and npc)
  endTurn = () => {
    // clear previous player highlight on the timeline
    let prevPlayer = this.timeline[this.turnIndex];
    this.uiScene.uiTimelineBackgrounds[this.turnIndex].fillColor =
      prevPlayer.isAlly ? 0x0000ff : 0xff0000;

    if (this.isPlayerTurn) {
      this.clearAccessibleTiles();
      this.clearOverlay();
      this.clearAoeZone();
      this.player.refillPoints();
      this.spellVisible = false;
      this.uiScene.endTurn();
    }
    this.isPlayerTurn = false;
    this.turnIndex++;
    if (this.turnIndex >= this.timeline.length) {
      this.turnIndex = 0;
    }
    let currentPlayer = this.timeline[this.turnIndex];
    // highlight current unit on the timeline
    this.uiScene.uiTimelineBackgrounds[this.turnIndex].fillColor = 0xffffff;
    if (currentPlayer instanceof Npc && !currentPlayer.isDead()) {
      currentPlayer.playTurn();
    } else {
      this.isPlayerTurn = true;
      this.refreshAccessibleTiles();
      this.highlightAccessibleTiles(this.accessibleTiles);
    }
  };

  override update(time: number, delta: number): void {}

  // checks if the unit can access this tile with their remaining PMs
  isAccessible(x: number, y: number, unitX: number, unitY: number, pm: number) {
    const startVec = new Phaser.Math.Vector2(unitX, unitY);
    const targetVec = new Phaser.Math.Vector2(x, y);
    // pathfinding
    const path = findPath(
      startVec,
      targetVec,
      this.background!,
      this.obstacles!
    );
    if (path.length > 0 && path.length <= pm) {
      return true;
    } else {
      return false;
    }
  }

  // highlight tiles accessible to the player
  // according to their remaining PMs
  highlightAccessibleTiles = (positions: Phaser.Math.Vector2[]) => {
    positions.forEach((pos) => {
      this.background?.getTileAt(pos.x, pos.y).setAlpha(0.6);
    });
  };

  // calculate the accessible tiles around a position with a pm radius
  calculateAccessibleTiles = (
    pos: Phaser.Math.Vector2,
    pm: number
  ): Phaser.Math.Vector2[] => {
    const { x, y } = pos;
    let tablePos: Phaser.Math.Vector2[] = [];
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
        if (
          !isPlayerTile &&
          pm >= distance &&
          this.isAccessible(tile.x, tile.y, x, y, pm)
        ) {
          tablePos.push(new Phaser.Math.Vector2(tile.x, tile.y));
        }
      });
    }
    return tablePos;
  };

  // refresh the accessible tiles around the player
  refreshAccessibleTiles() {
    this.accessibleTiles = this.calculateAccessibleTiles(
      new Phaser.Math.Vector2(this.player.indX, this.player.indY),
      this.player.pm
    );
  }

  // clear highlighted tiles
  clearAccessibleTiles = () => {
    this.background?.forEachTile((tile) => {
      tile.setAlpha(1);
      tile.tint = 0xffffff;
    });
  };

  // add a unit to the scene
  addUnit(
    key: string,
    frame: number,
    startX: number,
    startY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    name: string,
    npc: boolean,
    allied: boolean,
    ...spells: Spell[]
  ) {
    let unit: Unit;
    if (npc) {
      unit = new Npc(
        this,
        0,
        0,
        key,
        frame,
        startX,
        startY,
        maxPm,
        maxPa,
        maxHp,
        allied
      );
    } else {
      unit = new Player(
        this,
        0,
        0,
        key,
        frame,
        startX,
        startY,
        maxPm,
        maxPa,
        maxHp,
        allied
      );
    }
    unit.type = name;
    this.add.existing(unit);
    // set player start position
    let initialPlayerX = unit.tilePosToPixelsX();
    let initialPlayerY = unit.tilePosToPixelsY();
    unit.setPosition(initialPlayerX, initialPlayerY);
    const unitScale = 1.5;
    unit.setScale(unitScale);
    if (allied) {
      this.allies.push(unit);
    } else {
      this.enemies.push(unit);
    }
    // add spells
    unit.addSpells.apply(unit, spells);
    // unit is now considered as an obstacle for other units
    this.addToObstacleLayer(new Phaser.Math.Vector2(unit.indX, unit.indY));
    // initialize health bar
    unit.updateHealthBar();
    unit.depth = unit.y;
    // create blue or red circle under unit's feet to identify its team
    unit.createTeamIdentifier(unitScale);
    unit.setInteractive();
    return unit;
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

  // find a path with start and target vectors
  findPath(start: Phaser.Math.Vector2, target: Phaser.Math.Vector2) {
    return findPath(start, target, this.background!, this.obstacles!);
  }

  // update position of Unit as an obstacle for the others
  updateObstacleLayer(unit: Unit, target: Phaser.Math.Vector2) {
    this.removeFromObstacleLayer(unit);
    this.addToObstacleLayer(target);
  }

  // remove a unit from the obstacle layer
  removeFromObstacleLayer(unit: Unit) {
    this.obstacles?.removeTileAt(unit.indX, unit.indY);
  }

  removeUnitFromBattle(unit: Unit) {
    this.removeFromObstacleLayer(unit);
    this.removeUnitFromTimeline(unit);
    this.refreshAccessibleTiles();
    if (this.spellVisible) {
      this.displaySpellRange(this.currentSpell);
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
    this.clearAccessibleTiles();
    this.spellVisible = true;
    this.currentSpell = spell;
    this.spellRange = this.calculateSpellRange(this.player, spell)!;
    this.clearOverlay();
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
        //on hovering over a tile
        overlay.on("pointerover", () => {
          this.displayAoeZone(spell, tile.pixelX, tile.pixelY);
        });
        overlay.on("pointerout", () => {
          this.clearAoeZone();
        });
      }
    });
  }

  displayAoeZone(spell: Spell, x: number, y: number) {
    let highlightColor = 0xff0099;
    switch (spell.aoe) {
      case "monoTarget":
        this.spellAoeOverlay.push(
          this.add.rectangle(
            x + 0.5 * this.tileWidth,
            y + 0.5 * this.tileHeight,
            this.tileWidth,
            this.tileHeight,
            highlightColor,
            0.4
          )
        );
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        const target = this.background!.worldToTileXY(x, y);
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
              this.spellAoeOverlay.push(
                this.add.rectangle(
                  pos.x + 0.5 * this.tileWidth,
                  pos.y + 0.5 * this.tileHeight,
                  this.tileWidth,
                  this.tileHeight,
                  highlightColor,
                  0.4
                )
              );
            }
          }
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

  getUnitsInsideAoe(indX: number, indY: number, spell: Spell) {
    let units = [];
    switch (spell.aoe) {
      case "monoTarget":
        if (this.isUnitThere(indX, indY)) {
          units.push(this.getUnitAtPos(indX, indY));
        }
        break;
      case "star":
        for (let i = indX - spell.aoeSize; i <= indX + spell.aoeSize; i++) {
          for (let j = indY - spell.aoeSize; j <= indY + spell.aoeSize; j++) {
            let distance = Math.abs(indX - i) + Math.abs(indY - j);
            if (distance <= spell.aoeSize) {
              if (this.isUnitThere(i, j)) {
                units.push(this.getUnitAtPos(i, j));
              }
            }
          }
        }
        break;

      default:
        break;
    }
    return units;
  }

  // calculate spell range
  calculateSpellRange(unit: Unit, spell: Spell) {
    return this.background?.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => this.isVisible(unit, spell, tile),
      this,
      unit.indX - spell.maxRange,
      unit.indY - spell.maxRange,
      spell.maxRange * 2 + 1,
      spell.maxRange * 2 + 1
    );
  }

  // return true if tile is visible for a given unit and spell
  isVisible(unit: Unit, spell: Spell, tile: Phaser.Tilemaps.Tile) {
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
      else return isVisible(startVec, targetVec, this.obstacles!, this);
    }
    return false;
  }

  // return true if there is a unit at the specified position
  isUnitThere(x: number, y: number): boolean {
    return this.timeline.some((unit) => unit.indX == x && unit.indY == y);
  }

  // return unit at the specified position
  getUnitAtPos(x: number, y: number) {
    return this.timeline.find((unit) => unit.indX == x && unit.indY == y);
  }

  removeUnitFromTimeline(unit: Unit) {
    const index = this.timeline.findIndex(
      (timelineUnit) => timelineUnit == unit
    );
    if (index !== -1) {
      this.timeline.splice(index, 1);
      if (this.timeline.length > 0) {
        this.uiScene.updateTimeline(this.timeline);
      }
    }
  }

  clearSpellRange() {
    this.spellVisible = false;
    this.uiScene.clearSpellsHighlight();
    this.clearOverlay();
    this.clearAoeZone();
    this.clearAccessibleTiles();
    this.highlightAccessibleTiles(this.accessibleTiles);
  }

  private clearOverlay() {
    this.overlays.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.overlays = [];
  }

  gameOver() {
    this.scene.stop("UIScene");
    this.scene.start("GameOverScene");
  }
}

// play order : alternate between allies and enemies
let createTimeline = (allies: Unit[], enemies: Unit[]) => {
  const maxSize = Math.max(allies.length, enemies.length);
  let timeline: Unit[] = [];
  for (let i = 0; i < maxSize; i++) {
    if (allies.length > i) {
      timeline.push(allies[i]);
    }
    if (enemies.length > i) {
      timeline.push(enemies[i]);
    }
  }
  return timeline;
};
