import Phaser from 'phaser';
import { Unit } from '../classes/Unit';
import findPath from '../utils/findPath';

export class BattleScene extends Phaser.Scene {
  player!: Unit;
  clickedTile!: Phaser.Tilemaps.Tile | null;
  tileWidth!: number;
  tileHeight!: number;
  map!: Phaser.Tilemaps.Tilemap;
  isMoving: boolean = false;
  direction!: string;
  tileset!: Phaser.Tilemaps.Tileset | null;
  obstacles!: Phaser.Tilemaps.TilemapLayer | null;
  background!: Phaser.Tilemaps.TilemapLayer | null;
  moveChain: any = {};
  prevIndX!: number;
  prevIndY!: number;
  prevPM!: number;

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

    // create layers and player sprite
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

    // starting position (grid index)
    let startX = 5;
    let startY = 6;
    this.player = new Unit(this, 0, 0, 'player', 6, startX, startY, 6);
    this.add.existing(this.player);

    // layer for tall items appearing on top of the player like trees
    let overPlayer = this.map.createLayer(
      'calque_devant_joueur',
      this.tileset!,
      0,
      0
    );
    // transparent to see player beneath tall items
    overPlayer?.setAlpha(0.5);

    this.player.scale = 1.5;

    // set player start position
    let initialPlayerX = this.tilePosToPixelsX(this.player.indX);
    let initialPlayerY = this.tilePosToPixelsY(this.player.indY);
    this.player.setPosition(initialPlayerX, initialPlayerY);

    // camera settings
    let zoom = 6;
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player);
    this.cameras.main.roundPixels = true;

    // game grid
    this.add.grid(
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

    // animation for 'left' move, we don't need left and right
    // as we will use one and flip the sprite
    let framerate = 5;
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

    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        if (!this.isMoving) {
          const { worldX, worldY } = pointer;

          const startVec = this.background!.worldToTileXY(
            this.player.x,
            this.player.y
          );
          const targetVec = this.background!.worldToTileXY(worldX, worldY);

          if (this.isAccessible(targetVec.x, targetVec.y)) {
            this.prevIndX = this.player.indX;
            this.prevIndY = this.player.indY;
            this.prevPM = this.player.pm;

            // pathfinding
            let path = findPath(
              startVec,
              targetVec,
              this.background!,
              this.obstacles!
            );

            if (path.length > 0) {
              // fixes problem of stopping before last tile...
              path.pop();
              path.push(targetVec);

              // chain of movements (tweens)
              this.moveChain.targets = this.player;
              this.moveChain.onStart = () => {
                this.isMoving = true;
              };
              this.moveChain.onComplete = this.stop;
              this.moveChain.tweens = [];

              path.forEach((position) => {
                this.checkDirection(position.x, position.y);
              });
              this.tweens.chain(this.moveChain);
            }
          }
        }
      }
    );

    this.highlightAccessibleTiles();

    // remember to clean up on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });
  }

  // actual moving of the player
  // via tweens
  move(tilePos: number, direction: string) {
    this.isMoving = true;
    if (direction == 'left' || direction == 'right') {
      this.moveChain.tweens.push({
        x: this.tilePosToPixelsX(tilePos),
        ease: 'Linear',
        onStart: () => {
          this.startAnim(direction);
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    } else {
      this.moveChain.tweens.push({
        y: this.tilePosToPixelsY(tilePos),
        ease: 'Linear',
        onStart: () => {
          this.startAnim(direction);
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  // stop player movement
  // and their animation too
  stop = () => {
    this.isMoving = false;
    this.player.anims.stop();
    switch (this.direction) {
      case 'left':
        this.player.setTexture('player', 7);
        break;
      case 'right':
        this.player.setTexture('player', 7);
        break;
      case 'up':
        this.player.setTexture('player', 8);
        break;
      case 'down':
        this.player.setTexture('player', 6);
        break;
      default:
        break;
    }
    this.direction = '';
    this.clearAccessibleTiles(this.prevIndX, this.prevIndY, this.prevPM);
    this.highlightAccessibleTiles();
  };

  // called before actual move to check direction
  checkDirection(x: number, y: number) {
    // left
    if (this.player.indX - x == 1) {
      this.direction = 'left';
      this.move(x, this.direction);
      this.player.indX--;
      this.player.pm--;
    }
    // right
    else if (this.player.indX - x == -1) {
      this.direction = 'right';
      this.move(x, this.direction);
      this.player.indX++;
      this.player.pm--;
      // down
    } else if (this.player.indY - y == -1) {
      this.direction = 'down';
      this.move(y, this.direction);
      this.player.indY++;
      this.player.pm--;
      // up
    } else if (this.player.indY - y == 1) {
      this.direction = 'up';
      this.move(y, this.direction);
      this.player.indY--;
      this.player.pm--;
    }
  }

  override update(time: number, delta: number): void {}

  // convert a tile position (index) to actual pixel position
  // for a character
  tilePosToPixelsX(x: number) {
    return this.tileWidth * x + this.player.width / 2;
  }

  tilePosToPixelsY(y: number) {
    return this.map.tileWidth * y + this.player.height / 6;
  }

  startAnim(direction: string) {
    this.player.setFlipX(direction == 'left');
    this.player.anims.play(direction, true);
  }

  // checks if the player can access this tile with their remaining PMs
  isAccessible(x: number, y: number) {
    const startVec = new Phaser.Math.Vector2(
      this.player.indX,
      this.player.indY
    );
    const targetVec = new Phaser.Math.Vector2(x, y);

    // pathfinding
    let path = findPath(startVec, targetVec, this.background!, this.obstacles!);

    if (path.length > 0 && path.length <= this.player.pm) {
      return true;
    } else {
      return false;
    }
  }

  // highlight tiles accessible to the player
  // according to their remaining PMs
  highlightAccessibleTiles() {
    // add tile under player's feet
    this.background?.getTileAt(this.player.indX, this.player.indY).setAlpha(0.5);

    let tilesAround = this.background?.getTilesWithin(
      this.player.indX - this.player.pm,
      this.player.indY - this.player.pm,
      this.player.pm * 2 + 1,
      this.player.pm * 2 + 1
    );
    if (tilesAround) {
      tilesAround.forEach((tile) => {
        if (this.isAccessible(tile.x, tile.y)) {
          tile.setAlpha(0.5);
        }
      });
    }
  }

  // clear highlighted tiles
  clearAccessibleTiles(indX: number, indY: number, pm: number) {
    this.background?.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => {
        tile.setAlpha(1);
      },
      this,
      indX - pm,
      indY - pm,
      pm * 2 + 1,
      pm * 2 + 1
    );
  }
}
