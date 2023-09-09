import { Component, OnInit } from '@angular/core';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { UIScene } from './scenes/UIScene';

@Component({
  selector: 'app-rpg',
  templateUrl: './rpg.component.html',
  styleUrls: ['./rpg.component.sass']
})
export class RpgComponent implements OnInit {
  phaserGame!: Phaser.Game;
  config: Phaser.Types.Core.GameConfig;

  constructor() {
    this.config = {
      type: Phaser.AUTO,
      parent: 'content',
      width: 320,
      height: 240,
      zoom: 2,
      pixelArt: true,
      physics: {
          default: 'arcade',
          arcade: {
              gravity: { y: 0 },
              debug: true // set to true to view zones
          }
      },
      scene: [
          BootScene,
          WorldScene,
          BattleScene,
          UIScene
      ]
    };
  }

  ngOnInit() {
    this.phaserGame = new Phaser.Game(this.config);
  }

}
