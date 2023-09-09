import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  speed: number = 40;
  clickedTile!: Phaser.Tilemaps.Tile | null;
  posX: number = 5;
  posY: number = 8;
  tileWidth!: number;
  tileHeight!: number;
  map!: Phaser.Tilemaps.Tilemap;
  isMoving: boolean = false;
  direction!: string;
  tileset!: Phaser.Tilemaps.Tileset | null;

  constructor() {
    super({
      key: 'BattleScene',
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    this.map = this.make.tilemap({ key: 'battlemap' });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // tiles creation
    this.tileset = this.map.addTilesetImage('forest_tilemap', 'tiles');
    let background = this.map.createLayer(
      'calque_background',
      this.tileset!,
      0,
      0
    );
    let obstacles = this.map.createLayer(
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
    overPlayer?.setAlpha(0.5);
    // enable collisions for certain tiles
    //obstacles!.setCollisionByProperty({ collide: true });

    // player and boundaries creation
    // size of the hitbox (only the feet)
    this.player.setSize(
      this.player.displayWidth * 0.8,
      this.player.displayHeight / 3
    );
    this.player.setOffset(
      this.player.displayWidth * 0.1,
      this.player.displayHeight * (2 / 3)
    );
    this.player.scale = 1.5;

    // player start position
    let initialPlayerX = this.tilePosToPixelsX(this.posX);
    let initialPlayerY = this.tilePosToPixelsY(this.posY);
    this.player.setPosition(initialPlayerX, initialPlayerY);

    this.physics.world.bounds.width = this.map.widthInPixels;
    this.physics.world.bounds.height = this.map.heightInPixels;
    this.player.setCollideWorldBounds(false);

    // enables arrow keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // make the camera follow the player
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

    let grid = this.add.grid(
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

    // animation with key 'left', we don't need left and right
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

    // animation with key 'right'
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [7, 16, 7, 25],
      }),
      frameRate: framerate,
      repeat: -1,
    });

    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [8, 17, 8, 26],
      }),
      frameRate: framerate,
      repeat: -1,
    });

    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [6, 15, 6, 24],
      }),
      frameRate: framerate,
      repeat: -1,
    });

    // mouse clicks on tiles
    let pointer = this.input.activePointer;
    this.input.on(
      'pointerup',
      () => {
        this.clickedTile = this.map.getTileAtWorldXY(
          pointer.worldX,
          pointer.worldY,
          false,
          this.cameras.main,
          background!
        );

        if (this.clickedTile && !this.isMoving) {
          this.checkMovement();
        }

        console.log(pointer.worldX, pointer.worldY, this.clickedTile);
      },
      this
    );

    this.physics.add.collider(this.player, obstacles!);

    this.sys.events.on('wake', this.wake, this);
  }

  move(tilePos: number, direction: string) {
    if (direction == 'x') {
      this.tweens.add({
        targets: this.player,
        x: this.tilePosToPixelsX(tilePos),
        ease: 'Linear', // 'Cubic', 'Elastic', 'Bounce', 'Back'
        onStart: () => {this.isMoving = true;},
        onComplete: () => {this.stop()},
        duration: 300,
        repeat: 0, // -1: infinity
        yoyo: false,
      });
    } else {
      this.tweens.add({
        targets: this.player,
        y: this.tilePosToPixelsY(tilePos),
        ease: 'Linear', // 'Cubic', 'Elastic', 'Bounce', 'Back'
        onStart: () => {this.isMoving = true;},
        onComplete: () => {this.stop()},
        duration: 300,
        repeat: 0, // -1: infinity
        yoyo: false,
      });
    }
  }

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

  checkMovement() {
    // left
    if (
      this.posY == this.clickedTile!.y &&
      this.posX - this.clickedTile!.x == 1
    ) {
      this.player.setFlipX(true);
      this.player.anims.play('left', true);
      this.direction = "left";
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
      this.direction = "right";
      this.move(this.clickedTile!.x, 'x');
      this.posX++;
      // down
    } else if (
      this.posX == this.clickedTile!.x &&
      this.posY - this.clickedTile!.y == -1
    ) {
      this.player.setFlipX(false);
      this.player.anims.play('down', true);
      this.direction = "down";
      this.move(this.clickedTile!.y, 'y');
      this.posY++;
      // up
    } else if (
      this.posX == this.clickedTile!.x &&
      this.posY - this.clickedTile!.y == 1
    ) {
      this.player.setFlipX(false);
      this.player.anims.play('up', true);
      this.direction = "up";
      this.move(this.clickedTile!.y, 'y');
      this.posY--;
    }
  }

  override update(time: number, delta: number): void {
  }

  wake() {
    this.cursors.left.reset();
    this.cursors.right.reset();
    this.cursors.up.reset();
    this.cursors.down.reset();
  }

  tilePosToPixelsX(x: number) {
    return this.tileWidth * x + this.player.width / 2;
  }

  tilePosToPixelsY(y: number) {
    return this.map.tileWidth * y + this.player.height / 3;
  }
}
