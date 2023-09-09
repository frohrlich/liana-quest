import { Component, OnInit } from '@angular/core';
import Phaser from 'phaser';
import { GameScene } from './scenes/gameScene';
import { WelcomeScene } from './scenes/welcomeScene';
import { ScoreScene } from './scenes/scoreScene';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.sass']
})
export class GameComponent implements OnInit {
  phaserGame!: Phaser.Game;
  config: Phaser.Types.Core.GameConfig;
  
  constructor() {
    this.config = {
      title: "Starfall",
      type: Phaser.AUTO,
      height: 600,
      width: 800,
      scene: [WelcomeScene, GameScene, ScoreScene ],
      parent: 'game',
      physics: {
        default: "arcade",
        arcade: {
          debug: false
        }
      },
      backgroundColor: "#000033"
    };
  }
  
  ngOnInit() {
    this.phaserGame = new Phaser.Game(this.config);
  }
}