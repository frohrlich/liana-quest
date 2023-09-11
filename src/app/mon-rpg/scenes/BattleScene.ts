import Phaser from 'phaser';
import { Unit } from '../classes/Unit';
import findPath from '../utils/findPath';
import { Npc } from '../classes/Npc';

export class BattleScene extends Phaser.Scene {
  player!: Unit;
  enemy!: Unit;
  clickedTile!: Phaser.Tilemaps.Tile | null;
  tileWidth!: number;
  tileHeight!: number;
  map!: Phaser.Tilemaps.Tilemap;
  isMoving: boolean = false;
  direction!: string;
  tileset!: Phaser.Tilemaps.Tileset | null;
  obstacles!: Phaser.Tilemaps.TilemapLayer | null;
  background!: Phaser.Tilemaps.TilemapLayer | null;

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
    this.player = this.addCharacter('player', 6, playerStartX, playerStartY, 6);
    let enemyStartX = 18;
    let enemyStartY = 2;
    this.enemy = this.addCharacter('player', 30, enemyStartX, enemyStartY, 6, true);

    // layer for tall items appearing on top of the player like trees
    let overPlayer = this.map.createLayer(
      'calque_devant_joueur',
      this.tileset!,
      0,
      0
    );
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

    // create player animations with framerate
    this.createAnimations(5);

    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        if (!this.isMoving) {
          const { worldX, worldY } = pointer;

          const startVec = new Phaser.Math.Vector2(this.player.indX, this.player.indY);
          const targetVec = this.background!.worldToTileXY(worldX, worldY);

          // pathfinding
          let path = findPath(
            startVec,
            targetVec,
            this.background!,
            this.obstacles!
          );

          if(!this.player.isMoving) {
            this.player.moveAlong(path);
          }
        }
      }
    );

    this.highlightAccessibleTiles(this.player);

    // remember to clean up on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });

    this.scene.run('UIScene');
  }

  endTurn = () => {
    if (!this.isMoving) {
      this.player.refillPoints();
      this.enemy.refillPoints();
      (this.enemy as Npc).playTurn();
      this.clearAccessibleTiles();
      // this.highlightAccessibleTiles();
    }
  };

  override update(time: number, delta: number): void {}

  // checks if the unit can access this tile with their remaining PMs
  isAccessible(x: number, y: number, unit:Unit) {
    const startVec = new Phaser.Math.Vector2(
      unit.indX,
      unit.indY
    );
    const targetVec = new Phaser.Math.Vector2(x, y);

    // pathfinding
    let path = findPath(startVec, targetVec, this.background!, this.obstacles!);

    if (path.length > 0 && path.length <= unit.pm) {
      return true;
    } else {
      return false;
    }
  }

  // highlight tiles accessible to the player
  // according to their remaining PMs
  highlightAccessibleTiles = (unit: Unit) => {
    // add tile under player's feet
    this.background
      ?.getTileAt(unit.indX, unit.indY)
      .setAlpha(0.5);

    let tilesAround = this.background?.getTilesWithin(
      unit.indX - unit.pm,
      unit.indY - unit.pm,
      unit.pm * 2 + 1,
      unit.pm * 2 + 1
    );
    if (tilesAround) {
      tilesAround.forEach((tile) => {
        if (this.isAccessible(tile.x, tile.y, unit)) {
          tile.setAlpha(0.5);
        }
      });
    }
  }

  // clear highlighted tiles
  clearAccessibleTiles = () => {
    this.background?.forEachTile((tile) => {tile.setAlpha(1);});
  }

  addCharacter(
    key: string,
    frame: number,
    startX: number,
    startY: number,
    maxPm: number,
    npc:boolean = false
  ) {
    let unit;
    if(npc) {
      unit = new Npc(this, 0, 0, key, frame, startX, startY, maxPm);
    } else {
      unit = new Unit(this, 0, 0, key, frame, startX, startY, maxPm);
    }
    this.add.existing(unit);
    // set player start position
    let initialPlayerX = unit.tilePosToPixelsX();
    let initialPlayerY = unit.tilePosToPixelsY();
    unit.setPosition(initialPlayerX, initialPlayerY);
    unit.scale = 1.5;
    return unit;
  }

  // animation for 'left' move, we don't need left and right
  // as we will use one and flip the sprite
  createAnimations = (framerate: number) => {
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [7, 16, 7, 25],
      }),
      frameRate: framerate,
      repeat: -1,
    });

    // animation for 'right'
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [7, 16, 7, 25],
      }),
      frameRate: framerate,
      repeat: -1,
    });

    // animation for 'up'
    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [8, 17, 8, 26],
      }),
      frameRate: framerate,
      repeat: -1,
    });

    // animation for 'down'
    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [6, 15, 6, 24],
      }),
      frameRate: framerate,
      repeat: -1,
    });
  }
}
