import Phaser from "phaser";
import { BattleScene } from "../../scenes/BattleScene";
import { Spell } from "./Spell";
import { UITimelineSlot } from "../UI/UITimelineSlot";
import { EffectOverTime } from "./EffectOverTime";
import { ServerUnit } from "../../../server/classes/ServerUnit";

export class Unit extends Phaser.GameObjects.Sprite {
  // use these to manipulate sprite positions around units
  healthBarOverUnitOffset = 7;
  healthBarUnderUnitOffset = 32;
  effectIconOverUnitOffset = 19;
  effectIconUnderUnitOffset = 53;
  healthBarScale = 1.2;

  selectedTint = 0x777777;
  readyIconFrame = 57;
  deathDelay = 200;

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
  baseTint: number;
  direction: string;
  isMoving: boolean;
  // chain of tweens containing the successive moving tweens in path from tile A to tile B
  moveChain: any = {};
  frameNumber: number;
  isTeamA: boolean;
  healthBar!: Phaser.GameObjects.Graphics;
  // team identifier under unit's feet (blue ally, red enemy)
  identifier!: Phaser.GameObjects.Image;
  spells: Spell[] = [];
  timelineSlot!: UITimelineSlot;
  effectOverTime: EffectOverTime = null;
  effectIcon: Phaser.GameObjects.Image;
  summonedUnits: Unit[] = [];
  id: string;
  isSelected: boolean;
  readyIcon: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    baseTint: number,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    isTeamA: boolean
  ) {
    super(scene, x, y, texture, frame);
    this.baseTint = baseTint;
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
    this.isTeamA = isTeamA;

    // tween move chain setup
    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
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
    this.myScene.units.forEach((unit) => {
      unit.unselectUnit();
    });
    this.isSelected = true;
    this.tint = this.selectedTint;
    this.timelineSlot.tint = this.selectedTint;
    this.healthBar.setVisible(true);
    if (this.effectIcon) this.effectIcon.setVisible(true);
    this.myScene.uiScene.changeStatsUnit(this);
  }

  unselectUnit() {
    this.isSelected = false;
    this.tint = this.baseTint;
    this.timelineSlot.tint = this.baseTint;
    this.healthBar.setVisible(false);
    if (this.effectIcon) this.effectIcon.setVisible(false);
    this.myScene.uiScene.changeStatsUnit(this.myScene.currentPlayer);
  }

  // move along a path
  moveAlong(path: Phaser.Math.Vector2[]) {
    this.myScene.removeFromObstacleLayer(this.indX, this.indY);

    if (!path || path.length <= 0) {
      if (this.isMoving) {
        // when end of path is reached, start the chain of movement tweens
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift());
  }

  // check next direction to take
  // and call move function that adds the actual movement to the tween chain
  moveTo(target: Phaser.Math.Vector2) {
    this.isMoving = true;

    let targetIndX = target.x;
    let targetIndY = target.y;

    let direction = "";

    if (this.indX - targetIndX > 0) {
      direction = "left";
    } else if (this.indX - targetIndX < 0) {
      direction = "right";
    } else if (this.indY - targetIndY < 0) {
      direction = "down";
    } else if (this.indY - targetIndY > 0) {
      direction = "up";
    } else {
      direction = "down"; // just in case, to avoid missing animations warning
    }

    this.direction = direction;

    this.move(targetIndX, targetIndY, direction);

    this.indX = targetIndX;
    this.indY = targetIndY;

    this.moveAlong(this.movePath);
  }

  private move(targetIndX: number, targetIndY: number, direction: string) {
    this.moveChain.tweens.push({
      x: this.tilePosToPixelsX(targetIndX),
      y: this.tilePosToPixelsY(targetIndY),
      ease: "Linear",
      onStart: () => {
        this.startMovingAnim(direction);
      },
      onUpdate: () => {
        this.moveUnitAttributes();
        this.depth = this.y;
      },
      duration: 300,
      repeat: 0,
      yoyo: false,
    });
  }

  private moveUnitAttributes() {
    this.moveHealthBarToPlayerPosition();
    this.moveTeamIdentifier();
    if (this.effectIcon) this.moveEffectIconToPlayerPosition();
  }

  moveHealthBarToPlayerPosition() {
    const barWidth = this.displayWidth * 1.2;
    this.healthBar.x = this.x - barWidth / 2;
    // if unit is on top of screen health bar must be below it
    this.healthBar.y = this.isOnTop()
      ? this.y + this.healthBarUnderUnitOffset
      : this.y - this.displayHeight - this.healthBarOverUnitOffset;
  }

  private isOnTop() {
    return this.y < this.myScene.tileHeight * 3;
  }

  moveTeamIdentifier() {
    this.identifier.x = this.x;
    this.identifier.y = this.y;
  }

  // stop player movement
  // and their animations too
  stopMovement = () => {
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
    this.anims.stop();
    this.changeDirection(this.direction);
    this.direction = "";
    this.moveChain.tweens = [];
    this.isMoving = false;
    this.refreshUI();
    this.nextAction();
  };

  // convert a tile position (index) to actual unit pixel position
  tilePosToPixelsX(indX: number) {
    return this.myScene.tileWidth * indX + this.width / 2;
  }

  tilePosToPixelsY(indY: number) {
    return this.myScene.tileHeight * indY + this.height / 6;
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

  nextAction() {}

  synchronizeWithServerUnit(serverUnit: ServerUnit) {
    this.hp = serverUnit.hp;
    this.indX = serverUnit.indX;
    this.indY = serverUnit.indY;
    this.maxHp = serverUnit.maxHp;
    this.maxPa = serverUnit.maxPa;
    this.pa = serverUnit.pa;
    this.maxPm = serverUnit.maxPm;
    this.pm = serverUnit.pm;
    this.id = serverUnit.id;
    this.spells = serverUnit.spells;

    this.addEffectOverTime(serverUnit.effectOverTime);
    this.updateHealthBar();
  }

  endTurn() {}

  isDead(): boolean {
    return this.hp <= 0;
  }

  // cast a spell at specified position
  castSpell(
    spell: Spell,
    targetVec: Phaser.Math.Vector2,
    affectedUnits: ServerUnit[],
    serverSummonedUnit: ServerUnit,
    timeline: ServerUnit[]
  ) {
    this.unitsUndergoSpell(affectedUnits, spell);
    // if spell summons a unit AND targeted tile is free, summon the unit
    if (serverSummonedUnit) {
      this.addSummonedUnit(serverSummonedUnit);
    }
    this.myScene.refreshAccessibleTiles();
    this.myScene.uiScene.refreshUIAfterSpell(spell);

    this.myScene.syncTimelineWithServer(timeline);
    this.myScene.uiScene.updateTimeline(this.myScene.timeline);
  }

  private unitsUndergoSpell(affectedUnits: ServerUnit[], spell: Spell) {
    affectedUnits.forEach((serverUnit) => {
      const myAffectedUnit = this.myScene.findUnitById(serverUnit.id);
      if (myAffectedUnit) {
        if (
          serverUnit.hp > 0 &&
          (myAffectedUnit.indX !== serverUnit.indX ||
            myAffectedUnit.indY !== serverUnit.indY)
        ) {
          myAffectedUnit.moveDirectlyToNewPosition(
            serverUnit.indX,
            serverUnit.indY
          );
        }
        myAffectedUnit.synchronizeWithServerUnit(serverUnit);
        myAffectedUnit.undergoSpell(spell);
      }
    });
  }

  private addSummonedUnit(serverSummonedUnit: ServerUnit) {
    const summonedUnit = this.myScene.addUnit(serverSummonedUnit, this.isTeamA);
    this.summonedUnits.push(summonedUnit);
  }

  undergoSpell(spell: Spell) {
    this.updateHealthBar();
    this.displaySpellEffect(
      spell.damage,
      spell.malusPM,
      spell.malusPA,
      spell.heal,
      spell.bonusPM,
      spell.bonusPA
    );
    this.checkDead();
  }

  // move function without animations used for push/pull spells
  moveDirectlyToNewPosition(indX: number, indY: number) {
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    const targetVec = new Phaser.Math.Vector2(indX, indY);
    this.myScene.removeFromObstacleLayer(this.indX, this.indY);
    this.myScene.tweens.add({
      targets: this,
      x: this.tilePosToPixelsX(targetVec.x),
      y: this.tilePosToPixelsY(targetVec.y),
      ease: "Linear",
      onUpdate: () => {
        this.moveUnitAttributes();
      },
      duration: 66 * startVec.distance(targetVec),
      repeat: 0,
      yoyo: false,
    });
    this.indX = indX;
    this.indY = indY;
    this.moveUnitAttributes();
    this.myScene.addToObstacleLayer(new Phaser.Math.Vector2(indX, indY));
  }

  undergoEffectOverTime(eot: EffectOverTime) {
    if (eot && eot.duration > 0) {
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
    let effect = scene.add
      .bitmapText(
        this.x - 2,
        isOnTop ? this.y + 22 : this.y - this.displayHeight + 3,
        "dogicapixel",
        (positive ? "+" : "-") + value.toString(),
        fontSize
      )
      .setTint(color);
    effect.setDepth(10001);
    effect.setOrigin(0.5, 0.5);
    // disappears after short time
    scene.time.delayedCall(
      300,
      () => {
        effect.destroy();
        if (blink)
          this.tint = this.isSelected ? this.selectedTint : this.baseTint;
      },
      undefined,
      effect
    );
  }

  checkDead() {
    if (this.isDead()) {
      this.die();
    }
  }

  die() {
    this.summonedUnits.forEach((unit) => {
      if (!unit.isDead()) unit.die();
    });
    this.unselectUnit();
    this.myScene.removeUnitFromBattle(this);
    // turn black before dying...
    this.tint = 0x000000;
    this.scene.time.delayedCall(
      this.deathDelay,
      () => {
        this.destroyUnit();
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
    this.removeReadyIcon();
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
    let identifierFrame = this.isTeamA ? 34 : 33;
    this.identifier = this.scene.add.image(
      this.x,
      this.y,
      "player",
      identifierFrame
    );
    this.identifier.setScale(scale);
  }

  setBarValue(bar: Phaser.GameObjects.Graphics, percentage: number) {
    //scale the bar
    bar.scaleX = percentage / 100;
  }

  updateHealthBar() {
    if (this.healthBar) this.healthBar.destroy();

    // draw the bar
    this.healthBar = this.scene.add.graphics();
    const hpPercentage = Math.max(this.hp / this.maxHp, 0) * 100;
    this.setBarValue(this.healthBar, hpPercentage + 2);
    const barWidth = this.displayWidth * 1.2;
    const barAlpha = 0.8;
    if (hpPercentage <= 25) {
      this.healthBar.fillStyle(0xff0000, barAlpha);
    } else if (hpPercentage <= 50) {
      this.healthBar.fillStyle(0xffc802, barAlpha);
    } else {
      this.healthBar.fillStyle(0x2ecc71, barAlpha);
    }
    this.healthBar.fillRect(0, 0, barWidth, 8);

    this.healthBar.setDepth(10000);
    if (!this.isSelected) this.healthBar.setVisible(false);
    this.moveHealthBarToPlayerPosition();
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
    if (effectOverTime) {
      this.effectOverTime = { ...effectOverTime };
      if (this.effectIcon) this.effectIcon.destroy();
      this.makeEffectIcon(effectOverTime);
    }
  }

  makeEffectIcon(effectOverTime: EffectOverTime) {
    this.effectIcon = this.scene.add
      .image(0, 0, "player", effectOverTime.frame)
      .setScale(1)
      .setDepth(9999);
    if (!this.isSelected) this.effectIcon.setVisible(false);
    this.moveEffectIconToPlayerPosition();
  }

  moveEffectIconToPlayerPosition() {
    this.effectIcon.x = this.x;
    this.effectIcon.y = this.isOnTop()
      ? this.y + this.effectIconUnderUnitOffset
      : this.y - this.displayHeight - this.effectIconOverUnitOffset;
  }

  teleportToPosition(indX: number, indY: number) {
    this.myScene.removeFromObstacleLayer(this.indX, this.indY);
    this.indX = indX;
    this.indY = indY;
    this.myScene.addToObstacleLayer(new Phaser.Math.Vector2(indX, indY));
    this.x = this.tilePosToPixelsX(indX);
    this.y = this.tilePosToPixelsY(indY);
    this.depth = this.y;
    this.moveUnitAttributes();
  }

  addReadyIcon() {
    this.readyIcon = this.scene.add.image(
      this.x,
      this.isOnTop()
        ? this.y + this.displayHeight
        : this.y - this.displayHeight,
      "player",
      this.readyIconFrame
    );
    this.readyIcon.scale = 1;
    this.readyIcon.setDepth(9999);
  }

  removeReadyIcon() {
    if (this.readyIcon) this.readyIcon.destroy();
  }
}
