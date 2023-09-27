import Phaser from 'phaser';
import { UIElement } from './UIElement';
import { Spell } from './Spell';
import { BattleScene } from '../scenes/BattleScene';
import { UIScene } from '../scenes/UIScene';

export class UISpell extends UIElement {
  spell: Spell;
  text: Phaser.GameObjects.Text;
  battleScene: BattleScene;

  constructor(scene: Phaser.Scene, tab: number, posY: number, spell: Spell) {
    super(scene, tab, posY);
    this.spell = spell;
    this.battleScene = this.myScene.battleScene;
    this.text = this.addText(spell.name);
    this.text.setInteractive();
    this.text.on('pointerup', () => {
      if (this.battleScene.isPlayerTurn && !this.battleScene.player.isMoving) {
        if (this.battleScene.player.pa >= this.spell.cost) {
          (this.scene as UIScene).clearSpellsHighlight();
          this.text.setColor('#FFFFFF');
          this.battleScene.displaySpellRange(this.spell);
        }
      }
    });
  }

  // disable spell visually if player cannot launch it
  hideIfInaccessible() {
    if (this.isInaccessible()) {
      this.text.setColor('#00a025');
    } else {
      this.text.setColor('#00FF00');
    }
  }

  // true if unit cannot currently launch this spell
  isInaccessible() {
    return this.battleScene.player.pa < this.spell.cost;
  }

  override refresh(): void {}
}
