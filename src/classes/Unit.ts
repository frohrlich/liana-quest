import Phaser from "phaser";
import { BattleScene } from "../scenes/BattleScene";
import { Spell } from "./Spell";
import { UITimelineSlot } from "./UITimelineSlot";
import { EffectOverTime } from "./EffectOverTime";

export class Unit extends Phaser.GameObjects.Sprite {
  myScene: BattleScene;
  // position on the grid
  indX: number;
  indY: number;
  // movement points
  maxPm: number;
  pm: number;
  // action points
  maxPa: number;
  pa: number;
  // health points
  maxHp: number;
  hp: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];

  direction: string;
  isMoving: boolean;
  moveChain: any = {};
  frameNumber: number;
  isAlly: boolean;
  healthBar!: Phaser.GameObjects.Graphics;
  identifier!: Phaser.GameObjects.Image;
  spells: Spell[] = [];
  timelineSlot!: UITimelineSlot;
  effectOverTime: EffectOverTime = null;
  effectIcon: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    isAlly: boolean
  ) {
    super(scene, x, y, texture, frame);
    this.myScene = this.scene as BattleScene;
    this.indX = indX;
    this.indY = indY;
    this.maxPm = maxPm;
    this.maxPa = maxPa;
    this.pa = maxPa;
    this.pm = maxPm;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.direction = "";
    this.isMoving = false;
    this.frameNumber = frame;
    this.isAlly = isAlly;

    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      // depth is same as y
      // so units lower on the screen appear on top
      this.depth = this.y;
      this.isMoving = true;
    };
    this.moveChain.onComplete = this.stopMovement;
    this.moveChain.tweens = [];

    // health bar visible only on hover
    // also change color of unit and its timeline icon
    // and display unit stats on the UI
    this.addHoverEvents();
  }

  addHoverEvents() {
    this.on("pointerover", () => {
      this.selectUnit();
    });
    this.on("pointerout", () => {
      this.unselectUnit();
    });
  }

  unselectUnit() {
    this.tint = 0xffffff;
    this.timelineSlot.tint = 0xffffff;
    this.healthBar.setVisible(false);
    if (this.effectIcon) this.effectIcon.setVisible(false);
    this.myScene.uiScene.changeStatsUnit(this.myScene.player);
  }

  selectUnit() {
    this.tint = 0x777777;
    this.timelineSlot.tint = 0x777777;
    this.healthBar.setVisible(true);
    if (this.effectIcon) this.effectIcon.setVisible(true);
    this.myScene.uiScene.changeStatsUnit(this);
  }

  // refills movement points at turn beginning
  refillPoints() {
    this.pm = this.maxPm;
    this.pa = this.maxPa;
  }

  // move along a path
  moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0 || path.length > this.pm) {
      if (this.isMoving) {
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  // called before actual move to check direction
  moveTo(target: Phaser.Math.Vector2) {
    this.myScene.removeFromObstacleLayer(this);
    let { x, y } = target;
    // left
    if (this.indX - x == 1) {
      this.direction = "left";
      this.move(x, this.direction);
      this.indX--;
      this.pm--;
    }
    // right
    else if (this.indX - x == -1) {
      this.direction = "right";
      this.move(x, this.direction);
      this.indX++;
      this.pm--;
      // down
    } else if (this.indY - y == -1) {
      this.direction = "down";
      this.move(y, this.direction);
      this.indY++;
      this.pm--;
      // up
    } else if (this.indY - y == 1) {
      this.direction = "up";
      this.move(y, this.direction);
      this.indY--;
      this.pm--;
    }
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
    this.moveAlong(this.movePath);
  }

  // actual moving of the player
  // via tweens
  move(tilePos: number, direction: string) {
    this.isMoving = true;
    if (direction == "left" || direction == "right") {
      let deltaX = direction == "left" ? -1 : 1;
      this.moveChain.tweens.push({
        x: this.tilePosToPixelsX(deltaX),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        onUpdate: () => {
          this.moveHealthBar();
          this.moveTeamIdentifier();
          if (this.effectIcon) this.moveEffectIcon();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    } else {
      let deltaY = direction == "up" ? -1 : 1;
      this.moveChain.tweens.push({
        y: this.tilePosToPixelsY(deltaY),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        onUpdate: () => {
          this.moveHealthBar();
          this.moveTeamIdentifier();
          if (this.effectIcon) this.moveEffectIcon();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  moveHealthBar() {
    let isOnTop = this.y < this.myScene.tileHeight * 2;
    let barWidth = this.displayWidth * 0.8;
    this.healthBar.x = this.x - barWidth / 2;
    this.healthBar.y = isOnTop ? this.y + 15 : this.y - this.displayHeight + 5;
  }

  moveTeamIdentifier() {
    this.identifier.x = this.x;
    this.identifier.y = this.y;
  }

  // stop player movement
  // and their animations too
  stopMovement = () => {
    this.depth = this.y;
    this.isMoving = false;
    this.anims.stop();
    this.changeDirection(this.direction);
    this.direction = "";
    this.moveChain.tweens = [];
    this.refreshUI();
    this.nextAction();
  };

  // convert the tile position (index) of the character to actual pixel position
  tilePosToPixelsX(delta: number = 0) {
    return this.myScene.tileWidth * (this.indX + delta) + this.width / 2;
  }

  tilePosToPixelsY(delta: number = 0) {
    return this.myScene.tileHeight * (this.indY + delta) + this.height / 6;
  }

  startMovingAnim = (direction: string) => {
    // if direction is left, just flip the image for right
    this.setFlipX(direction.startsWith("left"));
    // if unit has type 'amazon', animation for left is 'leftamazon'
    this.play(direction + this.type, true);
  };

  startAttackAnim = (direction: string) => {
    // if direction is left, just flip the image for right
    this.setFlipX(direction.startsWith("left"));
    // if unit has type 'amazon', animation for left is 'leftamazon'
    this.play(direction + "Attack" + this.type, true);
  };

  // polymorphic methods
  playTurn() {
    this.undergoEffectOverTime();
  }

  nextAction() {}

  isDead(): boolean {
    return this.hp <= 0;
  }

  isInjured(): boolean {
    return this.hp < this.maxHp;
  }

  // cast a spell at specified position
  castSpell(spell: Spell, targetVec: Phaser.Math.Vector2) {
    this.lookAtTile(targetVec);
    this.startAttackAnim(this.direction);
    this.pa -= spell.cost;
    const affectedUnits = this.myScene.getUnitsInsideAoe(
      targetVec.x,
      targetVec.y,
      spell
    );
    affectedUnits.forEach((unit) => {
      unit.undergoSpell(spell);
    });
  }

  // Receive spell effects
  undergoSpell(spell: Spell) {
    this.hp -= spell.damage;
    this.hp = Math.min(this.hp + spell.heal, this.maxHp);
    this.pm -= spell.malusPM;
    this.pm += spell.bonusPM;
    this.pa -= spell.malusPA;
    this.pa += spell.bonusPA;
    if (spell.effectOverTime) {
      this.addEffectOverTime(spell.effectOverTime);
    }
    this.updateHealthBar();
    this.displaySpellEffect(
      spell.damage,
      spell.malusPM,
      spell.malusPA,
      spell.heal,
      spell.bonusPM,
      spell.bonusPA
    );
    this.refreshUI();
    this.checkDead();
  }

  undergoEffectOverTime() {
    const eot = this.effectOverTime;
    if (eot && eot.duration > 0) {
      this.hp -= eot.damage;
      // no healing over max hp
      this.hp = Math.min(this.hp + eot.heal, this.maxHp);
      this.pa -= eot.malusPA;
      this.pa += eot.bonusPA;
      this.pm -= eot.malusPM;
      this.pm += eot.bonusPM;
      this.updateHealthBar();
      eot.duration--;
      this.displaySpellEffect(
        eot.damage,
        eot.malusPM,
        eot.malusPA,
        eot.heal,
        eot.bonusPM,
        eot.bonusPA
      );
      this.refreshUI();
      if (eot.duration <= 0) {
        this.effectOverTime = null;
        this.effectIcon.destroy();
      }
      this.checkDead();
    }
  }

  // display damage animation when unit is hit
  displaySpellEffect(
    damage: number,
    malusPM: number,
    malusPA: number,
    heal: number,
    bonusPM: number,
    bonusPA: number
  ) {
    let dmgDelay = 0;
    const scene = this.scene;
    if (damage > 0) {
      // display damage with unit blinking red
      this.displayEffect(scene, damage, "damage", true);
      dmgDelay = 400;
    }
    if (!this.isDead()) {
      scene.time.delayedCall(dmgDelay, () => {
        let healDelay = 0;
        // display heal in green (no blinking)
        if (heal > 0) {
          this.displayEffect(scene, heal, "heal", false, true);
          healDelay = 400;
        }
        scene.time.delayedCall(healDelay, () => {
          let pmDelay = 0;
          // display PM malus in white
          if (malusPM > 0) {
            this.displayEffect(scene, malusPM, "pm");
            pmDelay = 400;
          }
          scene.time.delayedCall(pmDelay, () => {
            let bonusPmDelay = 0;
            // display PM bonus in white
            if (bonusPM > 0) {
              this.displayEffect(scene, bonusPM, "pm", false, true);
              bonusPmDelay = 400;
            }
            scene.time.delayedCall(bonusPmDelay, () => {
              let paDelay = 0;
              // display PA malus in blue
              if (malusPA > 0) {
                this.displayEffect(scene, malusPA, "pa");
                paDelay = 400;
              }
              scene.time.delayedCall(paDelay, () => {
                // display PA bonus in blue
                if (bonusPA > 0) {
                  this.displayEffect(scene, bonusPA, "pa", false, true);
                  paDelay = 400;
                }
              });
            });
          });
        });
      });
    }
  }

  displayEffect(
    scene: Phaser.Scene,
    value: number,
    type: string,
    blink: boolean = false,
    positive: boolean = false
  ) {
    let color: number;
    const fontSize = 16;
    if (blink) this.tint = 0xff0000;
    switch (type) {
      case "damage":
        color = 0xff0000;
        break;
      case "heal":
        color = 0x00dd00;
        break;
      case "pm":
        color = 0xffffff;
        break;
      case "pa":
        color = 0x33c6f7;
        break;
      default:
        break;
    }
    let isOnTop = this.indY < 2;
    let malus = scene.add
      .bitmapText(
        this.x - 2,
        isOnTop ? this.y + 20 : this.y - this.displayHeight + 5,
        "rainyhearts",
        (positive ? "+" : "-") + value.toString(),
        fontSize
      )
      .setTint(color);
    malus.setDepth(10001);
    malus.setOrigin(0.5, 0.5);
    // disappears after short time
    scene.time.delayedCall(
      300,
      () => {
        malus.destroy();
        if (blink) this.tint = 0xffffff;
      },
      undefined,
      malus
    );
  }

  checkDead() {
    if (this.isDead()) {
      this.unselectUnit();
      this.myScene.removeUnitFromBattle(this);
      // turn black before dying...
      this.tint = 0x000000;
      this.scene.time.delayedCall(
        400,
        () => {
          this.healthBar.destroy();
          this.identifier.destroy();
          this.timelineSlot.destroy();
          if (this.effectIcon) this.effectIcon.destroy();
          // if it's the player that just died... game over
          if (this.myScene.player === this) this.myScene.gameOver();
          this.destroy();
        },
        undefined,
        this
      );
    }
  }

  // look at a position (change player direction)
  lookAtTile(targetVec: Phaser.Math.Vector2) {
    let direction = "";
    // upper right corner
    if (targetVec.x >= this.indX && targetVec.y <= this.indY) {
      if (targetVec.x + targetVec.y < this.indX + this.indY) {
        direction = "up";
      } else {
        direction = "right";
      }
      // lower right corner
    } else if (targetVec.x >= this.indX && targetVec.y > this.indY) {
      if (targetVec.x - targetVec.y < this.indX - this.indY) {
        direction = "down";
      } else {
        direction = "right";
      }
      // lower left corner
    } else if (targetVec.x < this.indX && targetVec.y >= this.indY) {
      if (targetVec.x + targetVec.y < this.indX + this.indY) {
        direction = "left";
      } else {
        direction = "down";
      }
      // upper left corner
    } else if (targetVec.x < this.indX && targetVec.y < this.indY) {
      if (targetVec.x - targetVec.y < this.indX - this.indY) {
        direction = "left";
      } else {
        direction = "up";
      }
    }
    this.changeDirection(direction);
  }

  // change player direction
  changeDirection(direction: string) {
    switch (direction) {
      case "left":
        // if direction is left, just flip the image for right
        this.setFlipX(true);
        this.setTexture("player", this.frameNumber + 1);
        break;
      case "right":
        this.setFlipX(false);
        this.setTexture("player", this.frameNumber + 1);
        break;
      case "up":
        this.setFlipX(false);
        this.setTexture("player", this.frameNumber + 2);
        break;
      case "down":
        this.setFlipX(false);
        this.setTexture("player", this.frameNumber);
        break;
      default:
        break;
    }
    this.direction = direction;
  }

  // refresh UI infos like player stats
  refreshUI() {
    this.myScene.uiScene.refreshUI();
  }

  // create team identifier (circle under unit's feet)
  createTeamIdentifier(scale: number) {
    // identifier frame on the spritesheet (red circle or blue circle)
    let identifierFrame = this.isAlly ? 34 : 33;
    this.identifier = this.scene.add.image(
      this.x,
      this.y,
      "player",
      identifierFrame
    );
    this.identifier.setScale(scale);
  }

  // create health bar
  makeBar(unit: Unit, color: number) {
    //draw the bar
    const bar = this.scene.add.graphics();
    //color the bar
    bar.fillStyle(color, 0.8);
    //fill the bar with a rectangle
    const barWidth = unit.displayWidth * 0.8;
    bar.fillRect(0, 0, barWidth, 5);
    //position the bar
    bar.x = unit.x - barWidth / 2;
    const isOnTop = this.y < this.myScene.tileHeight * 2;
    bar.y = isOnTop ? this.y + 15 : this.y - this.displayHeight + 5;
    //return the bar
    bar.setDepth(10000);
    return bar;
  }

  setBarValue(bar: Phaser.GameObjects.Graphics, percentage: number) {
    //scale the bar
    bar.scaleX = percentage / 100;
  }

  updateHealthBar() {
    if (!this.healthBar) {
      this.healthBar = this.makeBar(this, 0x2ecc71);
      this.setBarValue(this.healthBar, 100);
      this.healthBar.setVisible(false);
    } else {
      const hpPercentage = Math.max(this.hp / this.maxHp, 0) * 100;
      this.setBarValue(this.healthBar, hpPercentage + 2);
      const barWidth = this.displayWidth * 0.8;
      const barAlpha = 0.8;
      if (hpPercentage <= 25) {
        this.healthBar.fillStyle(0xff0000, barAlpha);
      } else if (hpPercentage <= 50) {
        this.healthBar.fillStyle(0xffc802, barAlpha);
      } else {
        this.healthBar.fillStyle(0x2ecc71, barAlpha);
      }
      this.healthBar.fillRect(0, 0, barWidth, 5);
    }
  }

  // add spells to a unit
  addSpells(...spells: Spell[]) {
    this.spells = this.spells.concat(spells);
  }

  // links unit to its timeline slot on the UI
  addTimelineSlot(slot: UITimelineSlot) {
    this.timelineSlot = slot;
  }

  addEffectOverTime(effectOverTime: EffectOverTime) {
    this.effectOverTime = { ...effectOverTime };
    if (this.effectIcon) this.effectIcon.destroy();
    this.effectIcon = this.makeEffectIcon(effectOverTime);
  }

  makeEffectIcon(effectOverTime: EffectOverTime) {
    const isOnTop = this.y < this.myScene.tileHeight * 2;
    //draw the bar
    const icon = this.scene.add.image(
      this.x,
      isOnTop ? this.y + 27 : this.y - this.displayHeight - 2,
      "player",
      effectOverTime.frame
    );
    icon.scale = 0.7;
    icon.setDepth(9999);
    icon.setVisible(false);
    return icon;
  }

  moveEffectIcon() {
    let isOnTop = this.y < this.myScene.tileHeight * 2;
    this.effectIcon.x = this.x;
    this.effectIcon.y = isOnTop ? this.y + 27 : this.y - this.displayHeight - 2;
  }
}
