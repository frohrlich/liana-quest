import Phaser from 'phaser';

export class DialogueScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'DialogueScene',
    });
  }

  create(): void {
    
    let sprite = this.add.image(0, 0, 'guerriere');
    sprite.setOrigin(0);
    let textDialogue = "Where am I ? I don't recognize this part\nof the forest...";
    this.add.text(sprite.width + 50, 50, textDialogue, {
      fontFamily: 'Scheherazade',
      color: '#FFFFFF',
      fontSize: 80,
    });

    // goes to next scene on click
    this.input.on(
      'pointerdown',
       (/*pointer*/) => {
        this.scene.start('WorldScene');
      },
      this
    );
  }

  override update(time: number): void {}
}
