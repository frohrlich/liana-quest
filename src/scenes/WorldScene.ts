import Phaser from "phaser";
import findPath from "../utils/findPath";
import { WorldUnit } from "../classes/WorldUnit";

export class WorldScene extends Phaser.Scene {
  player!: WorldUnit;
  spawns!: Phaser.Physics.Arcade.Group;
  speed: number = 80;

  background: Phaser.Tilemaps.TilemapLayer;
  tileWidth: number;
  tileHeight: number;

  constructor() {
    super({
      key: "WorldScene",
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    const map = this.make.tilemap({ key: "map" });
    this.tileWidth = map.tileWidth;
    this.tileHeight = map.tileHeight;

    // tiles creation
    const tiles = map.addTilesetImage("forest_tilemap", "tiles");
    this.background = map.createLayer("calque_background", tiles!, 0, 0);
    const obstacles = map.createLayer("calque_obstacles", tiles!, 0, 0);
    const startIndX = 3;
    const startIndY = 6;
    const frame = 6;
    const framerate = 7;
    this.player = new WorldUnit(this, startIndX, startIndY, "player", frame);
    this.physics.add.existing(this.player);
    this.add.existing(this.player);
    this.createAnimations(frame, framerate, this.player.type);
    // layer for tall items appearing on top of the player like trees
    map.createLayer("calque_devant_joueur", tiles!, 0, 0).setDepth(9999);
    // enable collisions for certain tiles
    obstacles!.setCollisionByProperty({ collide: true });

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
    this.physics.world.bounds.width = map.widthInPixels;
    this.physics.world.bounds.height = map.heightInPixels;
    this.player.setCollideWorldBounds(true);

    // make the camera follow the player
    const zoom = 2;
    this.cameras.main.setZoom(zoom);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.roundPixels = true;

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

    this.sys.events.on("wake", this.wake, this);

    this.enableDeplacementOnClick(this.background, obstacles);
  }

  override update(time: number, delta: number): void {}

  onMeetEnemy(player: any, zone: any) {
    // we move the zone to some other location
    zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
    zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);

    // shake the world
    this.cameras.main.shake(300);

    // start battle
    this.scene.switch("BattleScene");
  }

  wake() {}

  enableDeplacementOnClick(
    background: Phaser.Tilemaps.TilemapLayer,
    obstacles: Phaser.Tilemaps.TilemapLayer
  ) {
    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        if (!this.player.isMoving) {
          const { worldX, worldY } = pointer;
          const startVec = new Phaser.Math.Vector2(
            this.player.indX,
            this.player.indY
          );
          const targetVec = background.worldToTileXY(worldX, worldY);
          const path = findPath(startVec, targetVec, background, obstacles);
          if (path && path.length > 0) {
            this.player.moveAlong(path);
          }
        }
      }
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
    // animation for 'down'
    this.anims.create({
      key: "down" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite, baseSprite + 9, baseSprite, baseSprite + 18],
      }),
      frameRate: framerate,
      repeat: -1,
    });
  };
}
