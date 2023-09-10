import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  clickedTile!: Phaser.Tilemaps.Tile | null;

  // starter position of the player
  // (in tile index, from upper left corner, starting from 0)
  posX: number = 5;
  posY: number = 8;

  tileWidth!: number;
  tileHeight!: number;
  map!: Phaser.Tilemaps.Tilemap;
  isMoving: boolean = false;
  direction!: string;
  tileset!: Phaser.Tilemaps.Tileset | null;
  obstacles!: Phaser.Tilemaps.TilemapLayer | null;

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
    let background = this.map.createLayer(
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
    this.player = this.physics.add.sprite(0, 0, 'player', 6);
    // layer for tall items appearing on top of the player like trees
    let overPlayer = this.map.createLayer(
      'calque_devant_joueur',
      this.tileset!,
      0,
      0
    );
    // transparent to see player beneath tall items
    overPlayer?.setAlpha(0.5);

    // player and boundaries creation
    // set size and position of the hitbox (only the feet)
    this.player.setSize(
      this.player.displayWidth * 0.8,
      this.player.displayHeight / 3
    );
    this.player.setOffset(
      this.player.displayWidth * 0.1,
      this.player.displayHeight * (2 / 3)
    );
    this.player.scale = 1.5;

    // set player start position
    let initialPlayerX = this.tilePosToPixelsX(this.posX);
    let initialPlayerY = this.tilePosToPixelsY(this.posY);
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

    // register mouse clicks on tiles
    let pointer = this.input.activePointer;
    this.input.on(
      'pointerup',
      () => {
        // get clicked tile
        this.clickedTile = this.map.getTileAtWorldXY(
          pointer.worldX,
          pointer.worldY,
          false,
          this.cameras.main,
          background!
        );

        // if a tile is clicked and player not currently moving,
        // check if movement is possible
        if (this.clickedTile && !this.isMoving) {
          this.checkMovement();
        }

        console.log(pointer.worldX, pointer.worldY, this.clickedTile);
      },
      this
    );
  }

  // actual moving of the player
  // via tweens
  move(tilePos: number, direction: string) {
    if (direction == 'x') {
      this.tweens.add({
        targets: this.player,
        x: this.tilePosToPixelsX(tilePos),
        ease: 'Linear',
        onStart: () => {
          this.isMoving = true;
        },
        onComplete: () => {
          this.stop();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    } else {
      this.tweens.add({
        targets: this.player,
        y: this.tilePosToPixelsY(tilePos),
        ease: 'Linear',
        onStart: () => {
          this.isMoving = true;
        },
        onComplete: () => {
          this.stop();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  // stop player movement
  // and their animation too
  stop() {
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
  }

  // called after clicking on a tile
  // to check if movement is possible
  // if it is, start animation and call actual move method
  checkMovement() {
    // first check if clicked tile is an obstacle
    // if so, do nothing
    if (!this.isObstacle()) {
      // left
      if (
        this.posY == this.clickedTile!.y &&
        this.posX - this.clickedTile!.x == 1
      ) {
        this.player.setFlipX(true);
        this.player.anims.play('left', true);
        this.direction = 'left';
        this.move(this.clickedTile!.x, 'x');
        this.posX--;
      }
      // right
      else if (
        this.posY == this.clickedTile!.y &&
        this.posX - this.clickedTile!.x == -1
      ) {
        this.player.setFlipX(false);
        this.player.anims.play('right', true);
        this.direction = 'right';
        this.move(this.clickedTile!.x, 'x');
        this.posX++;
        // down
      } else if (
        this.posX == this.clickedTile!.x &&
        this.posY - this.clickedTile!.y == -1
      ) {
        this.player.setFlipX(false);
        this.player.anims.play('down', true);
        this.direction = 'down';
        this.move(this.clickedTile!.y, 'y');
        this.posY++;
        // up
      } else if (
        this.posX == this.clickedTile!.x &&
        this.posY - this.clickedTile!.y == 1
      ) {
        this.player.setFlipX(false);
        this.player.anims.play('up', true);
        this.direction = 'up';
        this.move(this.clickedTile!.y, 'y');
        this.posY--;
      }
    }
  }

  override update(time: number, delta: number): void {}

  // convert a tile position (index) to actual pixel position
  // for a character
  tilePosToPixelsX(x: number) {
    return this.tileWidth * x + this.player.width / 2;
  }

  tilePosToPixelsY(y: number) {
    return this.map.tileWidth * y + this.player.height / 3;
  }

  // check if clicked tile is an obstacle
  isObstacle(): boolean {
    let collides = this.obstacles!.getTileAt(this.clickedTile!.x, this.clickedTile!.y);
    if(collides) {
      return collides.properties.collide;
    } else {
      return false;
    }
  }
}