import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GameComponent } from './game/game.component';
import { RpgComponent } from './rpg/rpg.component';
import { MonRpgComponent } from './mon-rpg/mon-rpg.component';

@NgModule({
  declarations: [
    AppComponent,
    GameComponent,
    RpgComponent,
    MonRpgComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
