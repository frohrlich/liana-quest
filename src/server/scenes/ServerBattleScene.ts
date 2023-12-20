import { Server, Socket } from "socket.io";
import { OnlinePlayer, Position } from "./ServerWorldScene";
import { unitsAvailable } from "../../client/data/UnitData";

export interface ServerUnit {
  playerId: string;
  isPlayable: boolean;
  isAlly: boolean;
  indX: number;
  indY: number;
  type: string;
}

export class ServerBattleScene {
  io: Server;
  socket: Socket; // ! that's the socket of the creator of the battle
  id: string;
  allies: ServerUnit[] = [];
  enemies: ServerUnit[] = [];
  units: ServerUnit[] = [];

  currentPlayer: ServerUnit;
  map: any;
  background: any;
  obstacles: any;
  playerStarterTiles: Position[] = [];
  enemyStarterTiles: Position[] = [];
  mapName: string;

  isInPreparationMode: boolean;

  constructor(
    io: Server,
    socket: Socket,
    player: OnlinePlayer,
    enemy: OnlinePlayer,
    id: string
  ) {
    this.io = io;
    this.socket = socket;
    this.id = id;

    this.createTilemapAndStartUpBattle(player, enemy);
  }

  tellPlayerBattleHasStarted(socket: Socket) {
    socket.emit("battleHasStarted", this.allies, this.enemies, this.mapName);
    this.isInPreparationMode = true;
    this.listenToPreparationModeEvents(socket);
  }

  listenToPreparationModeEvents(socket: Socket) {
    socket.on(
      "playerChangedStartPosition",
      (playerId: string, position: Position) => {
        if (this.isInPreparationMode) {
          const myUnit = this.findUnitById(playerId);

          // check if new start position is authorized
          if (
            !this.obstacles.tileAt(position.indX, position.indY) &&
            !this.isUnitThere(position.indX, position.indY) &&
            ((myUnit.isAlly && myUnit.indX <= this.map.width / 3) ||
              (!myUnit.isAlly && myUnit.indX >= (this.map.width * 2) / 3))
          ) {
            myUnit.indX = position.indX;
            myUnit.indY = position.indY;
            // send info to all participants in battle that someone changed starter position
            this.io
              .to(this.id)
              .emit("playerHasChangedStartPosition", playerId, position);
          }
        }
      }
    );
  }

  addUnitsOnStart(newPlayer: OnlinePlayer, enemy: OnlinePlayer) {
    this.addUnitOnStart(newPlayer, true);
    this.addUnitOnStart(enemy, false);
  }

  addUnitOnStart(unit: OnlinePlayer, isAlly: boolean) {
    const playerData = unitsAvailable.find(
      (unitData) => unitData.name === unit.type
    );
    if (playerData) {
      let starterTiles: Position[];
      starterTiles = isAlly ? this.playerStarterTiles : this.enemyStarterTiles;
      let indX: number, indY: number;
      do {
        const randTile = Math.floor(Math.random() * (starterTiles.length - 1));
        indX = starterTiles[randTile].indX;
        indY = starterTiles[randTile].indY;
      } while (this.isUnitThere(indX, indY));
      const myPlayer = {
        playerId: unit.playerId,
        isPlayable: true,
        isAlly: isAlly,
        indX: indX,
        indY: indY,
        type: unit.type,
      };
      this.units.push(myPlayer);
      isAlly ? this.allies.push(myPlayer) : this.enemies.push(myPlayer);
      return myPlayer;
    } else {
      throw new Error("Error : unit not found");
    }
  }

  addPlayerAfterBattleStart(
    socket: Socket,
    player: OnlinePlayer,
    isAlly: boolean
  ) {
    const newPlayer = this.addUnitOnStart(player, isAlly);
    this.tellPlayerBattleHasStarted(socket);
    // update all other players of the new player
    socket.broadcast.to(this.id).emit("playerJoinedBattle", newPlayer);
  }

  private createTilemapAndStartUpBattle(player: any, enemy: any) {
    let tmx = require("tmx-parser");

    // choose map randomly among a set
    const mapCount = 3;
    const randomMapIndex = Math.floor(Math.random() * mapCount) + 1;
    this.mapName = `battlemap${randomMapIndex}`;

    tmx.parseFile(`./public/assets/map/${this.mapName}.tmx`, (err, map) => {
      if (err) throw err;
      this.map = map;
      this.background = map.layers[0];
      this.obstacles = map.layers[1];

      this.calculateStarterTiles();
      this.addUnitsOnStart(player, enemy);
      this.tellPlayerBattleHasStarted(this.socket);
    });
  }

  private calculateStarterTiles() {
    for (let i = 0; i < this.background.tiles.length; i++) {
      let tileX = i % this.map.width;
      let tileY = Math.floor(i / this.map.width);
      if (this.obstacles.tileAt(tileX, tileY) === undefined) {
        // player starter tiles on left
        if (tileX <= this.map.width / 3) {
          this.playerStarterTiles.push({ indX: tileX, indY: tileY });
          // enemy starter tiles on right
        } else if (tileX >= (this.map.width * 2) / 3) {
          this.enemyStarterTiles.push({ indX: tileX, indY: tileY });
        }
      }
    }
  }

  private findUnitById(id: string) {
    return this.units.find((unit) => unit.playerId === id);
  }

  // return true if there is a unit at the specified position
  private isUnitThere(x: number, y: number): boolean {
    return this.units.some((unit) => unit.indX == x && unit.indY == y);
  }
}
