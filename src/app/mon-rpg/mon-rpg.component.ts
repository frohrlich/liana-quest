import { Component, OnInit } from '@angular/core';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { BootScene } from './scenes/BootScene';
import { DialogueScene } from './scenes/DialogueScene';
import { BattleScene } from './scenes/BattleScene';
import { UIScene } from './scenes/UIScene';

@Component({
  selector: 'app-mon-rpg',
  templateUrl: './mon-rpg.component.html',
  styleUrls: ['./mon-rpg.component.sass']
})
export class MonRpgComponent implements OnInit {
  phaserGame!: Phaser.Game;
  config: Phaser.Types.Core.GameConfig;

  constructor() {
    this.config = {
      type: Phaser.AUTO,
      parent: 'content',
      width: 1920,
      height: 1080,
      zoom: 0.55,
      pixelArt: true,
      backgroundColor: '#282C31',
      physics: {
          default: 'arcade',
          arcade: {
              gravity: { y: 0 },
              debug: false
          }
      },
      scene: [
          BootScene,
          BattleScene,
          UIScene,
          DialogueScene,
          WorldScene
      ]
    };
  }

  ngOnInit() {
    this.phaserGame = new Phaser.Game(this.config);
  }

}
