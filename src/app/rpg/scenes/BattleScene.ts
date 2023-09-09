import Phaser from 'phaser';
import { Enemy } from '../classes/Enemy';
import { Player } from '../classes/Player';
import { Unit } from '../classes/Unit';

export class BattleScene extends Phaser.Scene {
  heroes!: Player[];
  enemies!: Enemy[];
  units!: Unit[];
  index!: number;
  attackMessage!: string;
  constructor() {
    super({
      key: 'BattleScene',
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    // change the background to green
    this.cameras.main.setBackgroundColor('rgba(0, 200, 0, 0.5)');
    this.startBattle();
    // on wake event we call startBattle too
    this.sys.events.on('wake', this.startBattle, this);
  }

  startBattle() {
    // player character - warrior
    var warrior = new Player(this, 250, 50, 'player', 1, 'Warrior', 100, 20);
    this.add.existing(warrior);

    // player character - mage
    var mage = new Player(this, 250, 100, 'player', 4, 'Mage', 80, 8);
    this.add.existing(mage);

    var dragonblue = new Enemy(
      this,
      50,
      50,
      'dragonblue',
      undefined,
      'Dragon',
      50,
      3
    );
    this.add.existing(dragonblue);

    var dragonOrange = new Enemy(
      this,
      50,
      100,
      'dragonorrange',
      undefined,
      'Dragon2',
      50,
      3
    );
    this.add.existing(dragonOrange);

    // array with heroes
    this.heroes = [warrior, mage];
    // array with enemies
    this.enemies = [dragonblue, dragonOrange];
    // array with both parties, who will attack
    this.units = this.heroes.concat(this.enemies);

    this.index = -1; // currently active unit

    this.scene.run('UIScene');
  }

  override update(time: number): void {}

  nextTurn() {
    if (this.checkEndBattle()) {
      this.endBattle();
      return;
    }

    do {
      this.index++;
      // if there are no more units, we start again from the first one
      if (this.index >= this.units.length) {
        this.index = 0;
      }
    } while (!this.units[this.index].living);

    // if its player hero
    if (this.units[this.index] instanceof Player) {
      this.events.emit('PlayerSelect', this.index);
    } else {
      // else if its enemy unit
      // pick random hero
      let r = Math.floor(Math.random() * this.heroes.length);
      // call the enemy"s attack function
      this.units[this.index].attack(this.heroes[r]);
      // add timer for the next turn, so will have smooth gameplay
      this.time.addEvent({
        delay: 3000,
        callback: this.nextTurn,
        callbackScope: this,
      });
    }
  }

  receivePlayerSelection(action: string, target: number) {
    if (action == 'attack') {
      this.units[this.index].attack(this.enemies[target]);
    }
    this.time.addEvent({
      delay: 3000,
      callback: this.nextTurn,
      callbackScope: this,
    });
  }

  enemyTurn() {
    // if its enemy unit turn
    // pick random hero
    let r = Math.floor(Math.random() * this.heroes.length);
    // call the enemy's attack function
    this.units[this.index].attack(this.heroes[r]);
    // add timer for the next turn, so will have smooth gameplay
    this.time.addEvent({
      delay: 3000,
      callback: this.nextTurn,
      callbackScope: this,
    });
  }

  checkEndBattle() {
    let victory = true;
    // if all enemies are dead we have victory
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].living) victory = false;
    }
    let gameOver = true;
    // if all heroes are dead we have game over
    for (let i = 0; i < this.heroes.length; i++) {
      if (this.heroes[i].living) gameOver = false;
    }
    return victory || gameOver;
  }

  endBattle() {
    // clear state, remove sprites
    this.heroes.length = 0;
    this.enemies.length = 0;
    for (var i = 0; i < this.units.length; i++) {
      // link item
      this.units[i].destroy();
    }
    this.units.length = 0;
    // sleep the UI
    this.scene.sleep('UIScene');
    // return to WorldScene and sleep current BattleScene
    this.scene.switch('WorldScene');
  }
}
