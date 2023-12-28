import { Server, Socket } from "socket.io";
import { OnlinePlayer, Position } from "./ServerWorldScene";
import { unitsAvailable } from "../../client/data/UnitData";
import { ServerUnit } from "./ServerUnit";

export class ServerBattleScene {
  io: Server;
  socket: Socket; // ! that's the socket of the creator of the battle
  id: string;
  allies: ServerUnit[] = [];
  enemies: ServerUnit[] = [];
  units: ServerUnit[] = [];
  timeline: ServerUnit[] = [];

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
          if (!myUnit.isReady) {
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
      }
    );

    // on clicking start battle button
    socket.on("playerIsReady", (playerId: string) => {
      const myPlayer = this.findUnitById(playerId);
      if (myPlayer) {
        myPlayer.isReady = true;
        socket.emit("readyIsConfirmed");
      }
      if (this.everyoneIsReady()) {
        this.startBattleMainPhase();
      }
    });
  }

  private startBattleMainPhase() {
    this.isInPreparationMode = false;
    this.io.to(this.id).emit("startMainBattlePhase");
    this.io
      .to("world")
      .emit("fightPreparationIsOver", this.enemies[0].playerId);

    this.socket.on("playerClickedEndTurn", (playerId) => {
      const myUnit = this.findUnitById(playerId);
      myUnit.endTurn();
      this.io.to(this.id).emit("endPlayerTurn", myUnit);
    });
  }

  everyoneIsReady() {
    return this.units.every((unit) => unit.isReady);
  }

  addUnitsOnStart(newPlayer: OnlinePlayer, enemy: OnlinePlayer) {
    this.addUnitOnStart(newPlayer, true, true);
    this.addUnitOnStart(enemy, false, false);
    this.createTimeline();
  }

  addUnitOnStart(unit: OnlinePlayer, isAlly: boolean, isPlayable: boolean) {
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
      const myUnit = new ServerUnit(
        !isPlayable, // npcs are ready by default so the battle can start
        unit.playerId,
        isPlayable,
        isAlly,
        indX,
        indY,
        unit.type
      );
      this.units.push(myUnit);
      isAlly ? this.allies.push(myUnit) : this.enemies.push(myUnit);
      return myUnit;
    } else {
      throw new Error("Error : unit not found");
    }
  }

  addPlayerAfterBattleStart(
    socket: Socket,
    player: OnlinePlayer,
    isAlly: boolean
  ) {
    const newPlayer = this.addUnitOnStart(player, isAlly, true);
    this.timeline.push(newPlayer);
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

  // play order : alternate between allies and enemies
  createTimeline() {
    const maxSize = Math.max(this.allies.length, this.enemies.length);
    for (let i = 0; i < maxSize; i++) {
      if (this.allies.length > i) {
        this.timeline.push(this.allies[i]);
      }
      if (this.enemies.length > i) {
        this.timeline.push(this.enemies[i]);
      }
    }
  }
}
