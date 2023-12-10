import Phaser from "phaser";
import { BattleScene } from "../../scenes/BattleScene";
import { Spell } from "./Spell";
import { UITimelineSlot } from "../UI/UITimelineSlot";
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

  // name representing the apparence of the unit
  textureStr: string;
  direction: string;
  isMoving: boolean;
  // chain of tweens containing the successive moving tweens in path from tile A to tile B
  moveChain: any = {};
  frameNumber: number;
  isAlly: boolean;
  healthBar!: Phaser.GameObjects.Graphics;
  // team identifier under unit's feet (blue ally, red enemy)
  identifier!: Phaser.GameObjects.Image;
  spells: Spell[] = [];
  timelineSlot!: UITimelineSlot;
  effectOverTime: EffectOverTime = null;
  effectIcon: Phaser.GameObjects.Image;
  summonedUnits: Unit[] = [];

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
    this.textureStr = texture;
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

    // tween move chain setup
    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      // depth is same as y
      // so units lower on the screen appear on top
      this.depth = this.y;
      this.isMoving = true;
    };
    this.moveChain.onComplete = this.stopMovement;
    this.moveChain.tweens = [];

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

  // on select, highlight unit, show healthbar and effect icon, and show unit stats in UI
  selectUnit() {
    this.tint = 0x777777;
    this.timelineSlot.tint = 0x777777;
    this.healthBar.setVisible(true);
    if (this.effectIcon) this.effectIcon.setVisible(true);
    this.myScene.uiScene.changeStatsUnit(this);
  }

  unselectUnit() {
    this.tint = 0xffffff;
    this.timelineSlot.tint = 0xffffff;
    this.healthBar.setVisible(false);
    if (this.effectIcon) this.effectIcon.setVisible(false);
    this.myScene.uiScene.changeStatsUnit(this.myScene.currentPlayer);
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
        // when end of path is reached, start the chain of movement tweens
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  // check next direction to take, update tile position and pm,
  // and call move function that adds the actual movement to the tween chain
  moveTo(target: Phaser.Math.Vector2) {
    this.myScene.removeFromObstacleLayer(this);
    let { x, y } = target;
    // left
    if (this.indX - x == 1) {
      this.direction = "left";
      this.move(this.direction);
      this.indX--;
      this.pm--;
    }
    // right
    else if (this.indX - x == -1) {
      this.direction = "right";
      this.move(this.direction);
      this.indX++;
      this.pm--;
      // down
    } else if (this.indY - y == -1) {
      this.direction = "down";
      this.move(this.direction);
      this.indY++;
      this.pm--;
      // up
    } else if (this.indY - y == 1) {
      this.direction = "up";
      this.move(this.direction);
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
  move(direction: string) {
    this.isMoving = true;
    if (direction === "left" || direction === "right") {
      const deltaX = direction === "left" ? -1 : 1;
      this.moveChain.tweens.push({
        x: this.tilePosToPixelsX(deltaX),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        onUpdate: () => {
          this.moveUnitAttributes();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    } else {
      const deltaY = direction === "up" ? -1 : 1;
      this.moveChain.tweens.push({
        y: this.tilePosToPixelsY(deltaY),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        onUpdate: () => {
          this.moveUnitAttributes();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  private moveUnitAttributes() {
    this.moveHealthBar();
    this.moveTeamIdentifier();
    if (this.effectIcon) this.moveEffectIcon();
  }

  moveHealthBar() {
    const isOnTop = this.y < this.myScene.tileHeight * 2;
    const barWidth = this.displayWidth * 0.8;
    this.healthBar.x = this.x - barWidth / 2;
    // if unit is on top of screen health bar must be below it
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
    this.anims.stop();
    this.changeDirection(this.direction);
    this.direction = "";
    this.moveChain.tweens = [];
    this.isMoving = false;
    this.refreshUI();
    this.nextAction();
  };

  // convert the tile position (index) of the unit to actual pixel position
  // with optional delta
  tilePosToPixelsX(delta: number = 0) {
    return this.myScene.tileWidth * (this.indX + delta) + this.width / 2;
  }

  tilePosToPixelsY(delta: number = 0) {
    return this.myScene.tileHeight * (this.indY + delta) + this.height / 6;
  }

  startMovingAnim = (direction: string) => {
    // if direction is left, just flip the image for right
    this.setFlipX(direction.startsWith("left"));
    // i.e. if unit has type 'Amazon', animation for left has key 'leftAmazon'
    this.play(direction + this.type, true);
  };

  startAttackAnim = (direction: string) => {
    this.setFlipX(direction.startsWith("left"));
    this.play(direction + "Attack" + this.type, true);
  };

  // these three methods are redefined by subclasses
  playTurn() {
    this.undergoEffectOverTime();
  }

  nextAction() {}

  endTurn() {
    this.decrementSpellCooldowns();
    this.refillPoints();
    this.myScene.endTurn();
  }

  private decrementSpellCooldowns() {
    this.spells.forEach((spell) => {
      spell.cooldown--;
    });
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  // cast a spell at specified position
  castSpell(spell: Spell, targetVec: Phaser.Math.Vector2) {
    this.pa -= spell.cost;
    spell.cooldown = spell.maxCooldown;
    this.lookAtTile(targetVec);
    this.startAttackAnim(this.direction);
    const affectedUnits = this.myScene.getUnitsInsideAoe(
      this,
      targetVec.x,
      targetVec.y,
      spell
    );
    affectedUnits.forEach((unit) => {
      unit.undergoSpell(spell);
      if (spell.moveTargetBy) {
        // check alignment for spells that push or pull
        const isAlignedX = targetVec.y == this.indY;
        const isForward = isAlignedX
          ? Math.sign(targetVec.x - this.indX)
          : Math.sign(targetVec.y - this.indY);
        unit.moveBy(spell.moveTargetBy, isAlignedX, isForward);

        this.myScene.refreshAccessibleTiles();
        if (this.myScene.spellVisible) {
          this.myScene.displaySpellRange(this.myScene.currentSpell);
        }
      }
    });
    // if spell summons a unit AND targeted tile is free, summon the unit
    if (
      spell.summons &&
      !this.myScene.obstacles.getTileAt(targetVec.x, targetVec.y)
    ) {
      const summonedUnit = this.myScene.addUnit(
        spell.summons,
        targetVec.x,
        targetVec.y,
        false,
        this.isAlly
      );
      this.myScene.addSummonedUnitToTimeline(this, summonedUnit);
      this.summonedUnits.push(summonedUnit);
    }
    this.refreshUI();
  }

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

  // move function without animations used for push/pull spells
  moveBy(value: number, isAlignedX: boolean, isForward: number) {
    this.myScene.removeFromObstacleLayer(this);
    if (isAlignedX) {
      let deltaX = value * isForward;
      let direction = Math.sign(deltaX);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaX); i += direction) {
        let nextTileX = this.indX + i + direction;
        if (
          this.myScene.obstacles.getTileAt(nextTileX, this.indY) ||
          !this.myScene.background.getTileAt(nextTileX, this.indY) ||
          nextTileX < 0
        ) {
          deltaX = i;
          break;
        }
      }
      if (deltaX) {
        this.myScene.tweens.add({
          targets: this,
          x: this.tilePosToPixelsX(deltaX),
          ease: "Linear",
          onUpdate: () => {
            this.moveUnitAttributes();
          },
          duration: 66 * Math.abs(deltaX),
          repeat: 0,
          yoyo: false,
        });
        this.indX += deltaX;
      }
    } else {
      let deltaY = value * isForward;
      let direction = Math.sign(deltaY);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaY); i += direction) {
        let nextTileY = this.indY + i + direction;
        if (
          this.myScene.obstacles.getTileAt(this.indX, nextTileY) ||
          !this.myScene.background.getTileAt(this.indX, nextTileY) ||
          nextTileY < 0
        ) {
          deltaY = i;
          break;
        }
      }
      if (deltaY) {
        this.myScene.tweens.add({
          targets: this,
          y: this.tilePosToPixelsY(deltaY),
          ease: "Linear",
          onUpdate: () => {
            this.moveUnitAttributes();
            this.depth = this.y;
          },
          duration: 66 * Math.abs(deltaY),
          repeat: 0,
          yoyo: false,
        });
        this.indY += deltaY;
      }
    }
    this.moveUnitAttributes();
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
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
      this.die();
    }
  }

  private die() {
    this.summonedUnits.forEach((unit) => {
      if (!unit.isDead()) unit.die();
    });
    this.unselectUnit();
    this.myScene.removeUnitFromBattle(this);
    // turn black before dying...
    this.tint = 0x000000;
    this.scene.time.delayedCall(
      400,
      () => {
        if (this.myScene.gameIsOver()) {
          this.myScene.gameOver();
        }
        this.destroyUnit();
        if (this.myScene.battleIsFinished()) {
          this.myScene.endBattle();
        }
      },
      undefined,
      this
    );
  }

  destroyUnit() {
    this.healthBar.destroy();
    this.identifier.destroy();
    this.timelineSlot.destroy();
    if (this.effectIcon) this.effectIcon.destroy();
    this.destroy();
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
    const copySpells = [];
    // each unit must have its own copy of each spell to manage cooldowns separately
    spells.forEach((spell) => {
      copySpells.push({ ...spell });
    });
    this.spells = this.spells.concat(copySpells);
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
    const isOnTop = this.y < this.myScene.tileHeight * 2;
    this.effectIcon.x = this.x;
    this.effectIcon.y = isOnTop ? this.y + 27 : this.y - this.displayHeight - 2;
  }

  teleportToTile(indX: number, indY: number) {
    this.myScene.removeFromObstacleLayer(this);
    this.indX = indX;
    this.indY = indY;
    this.myScene.addToObstacleLayer(new Phaser.Math.Vector2(indX, indY));
    this.x = this.tilePosToPixelsX();
    this.y = this.tilePosToPixelsY();
    this.moveUnitAttributes();
  }
}
