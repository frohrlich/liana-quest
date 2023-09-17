import Phaser from 'phaser';
import { UIElement } from './UIElement';
import { Spell } from './Spell';
import { BattleScene } from '../scenes/BattleScene';

export class UISpell extends UIElement {
  spell: Spell;
  text: Phaser.GameObjects.Text;
  // true if spell range currently visible
  isVisible: boolean;
  battleScene: BattleScene;

  constructor(scene: Phaser.Scene, tab: number, posY: number, spell: Spell) {
    super(scene, tab, posY);
    this.spell = spell;
    this.battleScene = this.myScene.battleScene;
    this.text = this.addText(spell.name);
    this.text.setInteractive();
    this.isVisible = false;
    this.text.on('pointerup', () => {
      if (this.battleScene.isPlayerTurn && !this.battleScene.player.isMoving) {
        if (!this.isVisible) {
          this.battleScene.displaySpellRange(this.spell.range);
          this.isVisible = true;
        } else {
          this.battleScene.clearSpellRange();
          this.isVisible = false;
        }
      }
    });
  }
}
