import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameComponent } from './game/game.component';
import { RpgComponent } from './rpg/rpg.component';
import { MonRpgComponent } from './mon-rpg/mon-rpg.component';

const routes: Routes = [
  { path: 'game', component: GameComponent },
  { path: 'rpg', component: RpgComponent },
  { path: 'monrpg', component: MonRpgComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
