import Phaser from 'phaser';

export class WorldScene extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  spawns!: Phaser.Physics.Arcade.Group;
  speed:number = 80;

  constructor() {
    super({
      key: 'WorldScene',
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    let map = this.make.tilemap({ key: 'map' });

    // tiles creation
    let tiles = map.addTilesetImage('forest_tilemap', 'tiles');
    map.createLayer('calque_background', tiles!, 0, 0);
    let obstacles = map.createLayer('calque_obstacles', tiles!, 0, 0);
    this.player = this.physics.add.sprite(50, 100, 'player', 6);
    // layer for tall items appearing on top of the player like trees
    map.createLayer('calque_devant_joueur', tiles!, 0, 0);
    // enable collisions for certain tiles
    obstacles!.setCollisionByProperty({collide: true});
    
    // player and boundaries creation
    // size of the hitbox (only the feet)
    this.player.setSize(this.player.displayWidth*0.8, this.player.displayHeight/3);
    this.player.setOffset(this.player.displayWidth*0.1, this.player.displayHeight*(2./3));
    this.player.scale = 1.5;
    this.physics.world.bounds.width = map.widthInPixels;
    this.physics.world.bounds.height = map.heightInPixels;
    this.player.setCollideWorldBounds(true);

    // enables arrow keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // make the camera follow the player
    this.cameras.main.setZoom(4);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.roundPixels = true;

    // animation with key 'left', we don't need left and right
    // as we will use one and flip the sprite
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [7, 16, 7, 25],
      }),
      frameRate: 10,
      repeat: -1,
    });

    // animation with key 'right'
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [7, 16, 7, 25],
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [8, 17, 8, 26],
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [6, 15, 6, 24],
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.physics.add.collider(this.player, obstacles!);

    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Zone,
    });
    for (let i = 0; i < 30; i++) {
      let x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
      let y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
      let myZone = new Phaser.GameObjects.Zone(this, x, y, 20, 20);
      // parameters are x, y, width, height
      this.spawns.add(myZone);
    }
    this.physics.add.overlap(
      this.player,
      this.spawns,
      this.onMeetEnemy,
      undefined,
      this
    );

    this.sys.events.on('wake', this.wake, this);
  }

  override update(time: number, delta: number): void {
    this.player.body.setVelocity(0);

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-this.speed);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(this.speed);
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-this.speed);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(this.speed);
    }

    // Animations
    if (this.cursors.left.isDown) {
      this.player.setFlipX(true);
      this.player.anims.play('left', true);
    } else if (this.cursors.right.isDown) {
      this.player.setFlipX(false);
      this.player.anims.play('right', true);
    } else if (this.cursors.up.isDown) {
      this.player.setFlipX(false);
      this.player.anims.play('up', true);
    } else if (this.cursors.down.isDown) {
      this.player.setFlipX(false);
      this.player.anims.play('down', true);
    } else {
      this.player.anims.stop();
    }
  }

  onMeetEnemy(player: any, zone: any) {
    // we move the zone to some other location
    zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
    zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);

    // shake the world
    //this.cameras.main.shake(300);

    // start battle
    //this.scene.switch('BattleScene');
  }

  wake() {
    this.cursors.left.reset();
    this.cursors.right.reset();
    this.cursors.up.reset();
    this.cursors.down.reset();
  }
}
