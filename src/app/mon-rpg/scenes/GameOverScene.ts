import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'GameOverScene',
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#001100');
    let text = 'Game over...';
    let gameWidth = this.game.config.width as number;
    let gameHeight = this.game.config.height as number;
    let myText = this.add.text(
      gameWidth / 2,
      gameHeight / 2,
      text.toUpperCase(),
      {
        fontFamily: 'PublicPixel',
        color: '#00FF40',
        fontSize: 120,
      }
    );
    myText.setOrigin(0.5, 0.5);
  }
}
