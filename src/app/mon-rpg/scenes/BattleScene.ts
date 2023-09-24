import Phaser from 'phaser';
import { Unit } from '../classes/Unit';
import findPath from '../utils/findPath';
import { Npc } from '../classes/Npc';
import { Player } from '../classes/Player';
import { Spell } from '../classes/Spell';
import { UIScene } from './UIScene';
import plotLine from '../utils/lineOfSight';
import isVisible from '../utils/lineOfSight';

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
  spellRange: Phaser.Math.Vector2[] = [];
  currentSpell!: Spell;
  uiScene!: UIScene;

  constructor() {
    super({
      key: 'BattleScene',
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    // create tilemap and get tile dimensions
    this.map = this.make.tilemap({ key: 'battlemap' });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // get the tileset
    this.tileset = this.map.addTilesetImage('forest_tilemap', 'tiles');

    // create layers and characters sprites
    this.background = this.map.createLayer(
      'calque_background',
      this.tileset!,
      0,
      0
    );
    this.obstacles = this.map.createLayer(
      'calque_obstacles',
      this.tileset!,
      0,
      0
    );

    // add units
    // starting position (grid index)
    let playerStartX = 5;
    let playerStartY = 6;
    let playerFrame = 6;
    this.player = this.addUnit(
      'player',
      playerFrame,
      playerStartX,
      playerStartY,
      5,
      6,
      100,
      'amazon',
      false,
      true
    );
    // create player animations with base sprite and framerate
    this.createAnimations(playerFrame, 5, 'amazon');

    // ally 1
    playerStartX = 2;
    playerStartY = 5;
    playerFrame = 0;
    this.addUnit(
      'player',
      playerFrame,
      playerStartX,
      playerStartY,
      3,
      6,
      100,
      'dude',
      true,
      true
    );
    this.createAnimations(playerFrame, 5, 'dude');
    // ally 2
    playerStartX = 4;
    playerStartY = 2;
    playerFrame = 0;
    this.addUnit(
      'player',
      playerFrame,
      playerStartX,
      playerStartY,
      3,
      6,
      100,
      'dude',
      true,
      true
    );
    // enemy 1
    let enemyStartX = 14;
    let enemyStartY = 2;
    let enemyFrame = 30;
    this.addUnit(
      'player',
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      'snowman',
      true,
      false
    );
    // enemy 2
    enemyStartX = 18;
    enemyStartY = 6;
    enemyFrame = 30;
    this.addUnit(
      'player',
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      'snowman',
      true,
      false
    );
    // enemy 3
    enemyStartX = 17;
    enemyStartY = 3;
    enemyFrame = 30;
    this.addUnit(
      'player',
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      'snowman',
      true,
      false
    );
    this.createAnimations(enemyFrame, 5, 'snowman');

    // layer for tall items appearing on top of the player like trees
    let overPlayer = this.map.createLayer(
      'calque_devant_joueur',
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
            if (
              // check if clicked tile inside spell range
              this.spellRange.some((tile) => {
                return tile.x == targetVec.x && tile.y == targetVec.y;
              })
            ) {
              this.player.launchSpell(this.currentSpell, targetVec);
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

    this.scene.run('UIScene');
    this.uiScene = this.scene.get('UIScene') as UIScene;
  }

  // end unit turn (works for player and npc)
  endTurn = () => {
    if (this.isPlayerTurn) {
      this.clearAccessibleTiles();
      this.player.refillPoints();
      this.spellVisible = false;
      this.uiScene.endTurn();
    }
    this.isPlayerTurn = false;
    this.turnIndex++;
    if (this.turnIndex == this.timeline.length) {
      this.turnIndex = 0;
    }
    let currentPlayer = this.timeline[this.turnIndex];
    if (currentPlayer instanceof Npc) {
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
    allied: boolean
  ) {
    let unit;
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
      key: 'left' + name,
      frames: this.anims.generateFrameNumbers('player', {
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
    // animation for 'right'
    this.anims.create({
      key: 'right' + name,
      frames: this.anims.generateFrameNumbers('player', {
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
    // animation for 'up'
    this.anims.create({
      key: 'up' + name,
      frames: this.anims.generateFrameNumbers('player', {
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
    // animation for 'down'
    this.anims.create({
      key: 'down' + name,
      frames: this.anims.generateFrameNumbers('player', {
        frames: [baseSprite, baseSprite + 9, baseSprite, baseSprite + 18],
      }),
      frameRate: framerate,
      repeat: -1,
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
    let range = spell.range;
    this.spellRange = this.calculateSpellRange(range);
    this.spellRange.forEach((pos) => {
      let tile = this.background?.getTileAt(pos.x, pos.y);
      if (tile) {
        tile.setAlpha(0.6);
        tile.tint = 0x0000ff;
      }
    });
  }

  // calculate spell range
  calculateSpellRange(range: number) {
    let tablePos: Phaser.Math.Vector2[] = [];
    const tilesAround = this.background?.getTilesWithin(
      this.player.indX - range,
      this.player.indY - range,
      range * 2 + 1,
      range * 2 + 1
    );
    if (tilesAround) {
      tilesAround.forEach((tile) => {
        const playerPos = new Phaser.Math.Vector2(
          this.player.indX,
          this.player.indY
        );
        const target = new Phaser.Math.Vector2(tile.x, tile.y);
        // if free tile OR a unit is there AND there is a line of sight
        if (
          (!this.obstacles?.getTileAt(tile.x, tile.y) ||
            this.isUnitThere(tile.x, tile.y)) &&
          this.isVisible(playerPos, target)
        ) {
          const distance =
            Math.abs(tile.x - this.player.indX) +
            Math.abs(tile.y - this.player.indY);
          if (distance <= range) {
            tablePos.push(target);
          }
        }
      });
    }
    return tablePos;
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
    }
  }

  clearSpellRange() {
    this.spellVisible = false;
    this.clearAccessibleTiles();
    this.highlightAccessibleTiles(this.accessibleTiles);
  }

  // return true if there is a line of sight between start and target positions
  isVisible(startVec: Phaser.Math.Vector2, targetVec: Phaser.Math.Vector2) {
    return isVisible(startVec, targetVec, this.obstacles!, this);
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
