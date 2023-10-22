import Phaser from "phaser";
import findPath from "../utils/findPath";
import { WorldUnit } from "../classes/WorldUnit";
import { WorldNpc } from "../classes/WorldNpc";

export class WorldScene extends Phaser.Scene {
  player!: WorldUnit;
  spawns!: Phaser.Physics.Arcade.Group;
  speed: number = 80;
  unitScale = 1.5;

  background: Phaser.Tilemaps.TilemapLayer;
  tileWidth: number;
  tileHeight: number;
  map: Phaser.Tilemaps.Tilemap;
  obstacles: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super({
      key: "WorldScene",
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    this.map = this.make.tilemap({ key: "map" });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // tiles creation
    const tiles = this.map.addTilesetImage("forest_tilemap", "tiles");
    this.background = this.map.createLayer("calque_background", tiles!, 0, 0);
    this.obstacles = this.map.createLayer("calque_obstacles", tiles!, 0, 0);
    const startIndX = 3;
    const startIndY = 6;
    const frame = 6;
    const framerate = 7;
    this.player = new WorldUnit(
      this,
      startIndX,
      startIndY,
      "player",
      frame,
      "Amazon"
    );
    this.physics.add.existing(this.player);
    this.add.existing(this.player);
    this.player.scale = this.unitScale;
    this.createAnimations(frame, framerate, this.player.type);
    // layer for tall items appearing on top of the player like trees
    this.map.createLayer("calque_devant_joueur", tiles!, 0, 0).setDepth(9999);
    // enable collisions for certain tiles
    this.obstacles.setCollisionByProperty({ collide: true });

    // make the camera follow the player
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

    this.addEnemies();

    this.sys.events.on("wake", this.wake, this);

    this.enableDeplacementOnClick(this.background, this.obstacles);
  }

  private addEnemies() {
    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
    });

    // we place enemies on random location of the map (except obstacles)
    const enemyFrame = 30;
    for (let i = 0; i < 30; i++) {
      let indX: number, indY: number;
      do {
        indX = Phaser.Math.RND.between(0, this.map.width);
        indY = Phaser.Math.RND.between(0, this.map.height - 1);
      } while (this.obstacles.getTileAt(indX, indY));
      const myEnemy = new WorldNpc(
        this,
        indX,
        indY,
        "player",
        enemyFrame,
        "Snowman"
      );
      this.spawns.add(myEnemy, true);
      myEnemy.setHitboxScale(1.5);
      myEnemy.scale = this.unitScale;
    }
    this.physics.add.overlap(
      this.player,
      this.spawns,
      this.onMeetEnemy,
      undefined,
      this
    );
    this.createAnimations(enemyFrame, 7, "Snowman");
  }

  override update(time: number, delta: number): void {}

  onMeetEnemy(player: any, zone: any) {
    // we move the zone to some other location
    zone.x = Phaser.Math.RND.between(0, this.map.width) * this.tileWidth;
    zone.y = Phaser.Math.RND.between(0, this.map.height) * this.tileHeight;

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
