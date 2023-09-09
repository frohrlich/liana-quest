import Phaser from 'phaser';

export class WelcomeScene extends Phaser.Scene {
  title!: Phaser.GameObjects.Text;
  hint!: Phaser.GameObjects.Text;

  constructor() {
    super({
      key: 'WelcomeScene',
    });
  }

  create(): void {
    let titleText: string = 'Starfall';
    this.title = this.add.text(150, 200, titleText, {
      font: '128px Arial Bold',
      color: '#FBFBAC',
    });
    let hintText: string = 'Click to start';
    this.hint = this.add.text(300, 350, hintText, {
      font: '24px Arial Bold',
      color: '#FBFBAC',
    });
    this.input.on(
      'pointerdown',
       (/*pointer*/) => {
        this.scene.start('GameScene');
      },
      this
    );
  }
}
