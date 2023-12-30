import findPath, { Vector2 } from "../utils/findPath";
import { Server } from "socket.io";
import { ServerBattleScene } from "./ServerBattleScene";

export interface ServerWorldUnit {
  id: string;
  indX: number;
  indY: number;
  direction: string;
  type: string;
  isVisible: boolean;
}

export interface Position {
  indX: number;
  indY: number;
}

export class ServerWorldScene {
  players: ServerWorldUnit[] = [];
  npcs: ServerWorldUnit[] = [];
  ongoingBattles: ServerBattleScene[] = [];
  enemyCount = 30;
  minPosition = 0;
  io: Server;
  background: any;
  obstacles: any;
  map: any;

  constructor(io: Server) {
    this.io = io;

    this.createMap();

    io.on("connection", (socket) => {
      const newPlayer = {
        indX: Math.floor(Math.random() * 5) + 1,
        indY: Math.floor(Math.random() * 5) + 1,
        id: socket.id,
        type: "Amazon",
        direction: "down",
        isVisible: true,
      };

      socket.join("world");

      // create a new player and add it to our players object
      this.addNewPlayer(newPlayer, socket);

      socket.on("startBattle", (enemyId: string) => {
        const myPlayer = this.findCurrentPlayer(socket);
        const myNpc = this.findNpcById(enemyId);
        if (myNpc && myPlayer) {
          socket.leave("world");
          this.removePlayer(socket);
          const battleId = "battle" + enemyId;
          socket.join(battleId);
          this.ongoingBattles.push(
            new ServerBattleScene(io, socket, myPlayer, myNpc, battleId)
          );
          this.hideEnemyAndShowBattleIcon(enemyId);
        }
      });

      socket.on("playerClickedBattleIcon", (npcId: string) => {
        const myPlayer = this.findCurrentPlayer(socket);
        this.removePlayer(socket);
        socket.leave("world");
        const battleId = "battle" + npcId;
        socket.join(battleId);
        const myBattle = this.ongoingBattles.find(
          (battle) => battle.id === battleId
        );
        if (myBattle) {
          myBattle.addPlayerAfterBattleStart(socket, myPlayer, true);
        }
      });

      // plays when player returns from battle to world scene
      socket.on("endBattle", (player: ServerWorldUnit) => {
        this.addNewPlayer(player, socket);
        socket.join("world");
      });

      socket.on("disconnect", () => {
        this.removePlayer(socket);
        this.removePlayerFromBattles(socket);
      });

      socket.on("enemyKill", (enemyId: string) => {
        const index = this.npcs.findIndex((npc) => npc.id === enemyId);
        if (index !== -1) {
          this.npcs.splice(index, 1);
        }
        // emit a message to all players to remove this player
        io.to("world").emit("enemyWasKilled", enemyId);
      });

      socket.on("npcWinFight", (enemyId: string) => {
        const index = this.npcs.findIndex((npc) => npc.id === enemyId);
        if (index !== -1) {
          this.npcs[index].isVisible = true;
        }
        // emit a message to all players to make this npc visible again
        io.to("world").emit("npcWonFight", enemyId);
      });

      // when a player moves, update the player data
      socket.on("playerMovement", (movementData: Position) => {
        const currentPlayer = this.findCurrentPlayer(socket);

        if (currentPlayer) {
          const startVec: Vector2 = {
            x: currentPlayer.indX,
            y: currentPlayer.indY,
          };
          const targetVec: Vector2 = {
            x: movementData.indX,
            y: movementData.indY,
          };

          // check if movement is actually possible
          if (findPath(startVec, targetVec, this.background, this.obstacles)) {
            currentPlayer.indX = movementData.indX;
            currentPlayer.indY = movementData.indY;
            // emit a message to all players about the player that moved
            io.to("world").emit("playerMoved", currentPlayer);
          }
        }
      });

      socket.on("updateDirection", (direction: string) => {
        const currentPlayer = this.findCurrentPlayer(socket);
        if (currentPlayer) {
          currentPlayer.direction = direction;
        }
      });

      socket.on("updatePosition", (position: Position) => {
        const currentPlayer = this.findCurrentPlayer(socket);
        currentPlayer.indX = position.indX;
        currentPlayer.indY = position.indY;
      });
    });
  }

  private findNpcById(enemyId: string) {
    return this.npcs.find((npc) => npc.id === enemyId);
  }

  private createMap() {
    let tmx = require("tmx-parser");

    tmx.parseFile("./public/assets/map/map.tmx", (err, map) => {
      if (err) throw err;
      this.map = map;
      this.background = map.layers[0];
      this.obstacles = map.layers[1];

      // create npcs at random locations
      this.createRandomNpcs();
    });
  }

  private createRandomNpcs() {
    for (let i = 0; i < this.enemyCount; i++) {
      const id = i.toString();
      let indX: number, indY: number;
      do {
        indX =
          Math.floor(Math.random() * (this.map.width - this.minPosition)) +
          this.minPosition;
        indY =
          Math.floor(Math.random() * (this.map.height - this.minPosition - 1)) +
          this.minPosition;
      } while (this.obstacles.tileAt(indX, indY)); // but not on obstacles

      // toss a coin between snowman and dude...
      const enemyType = Math.floor(Math.random() * 2) ? "Snowman" : "Dude";
      const npc: ServerWorldUnit = {
        indX: indX,
        indY: indY,
        type: enemyType,
        id: id,
        direction: "down",
        isVisible: true,
      };
      this.npcs.push(npc);

      const delay = 10000;
      const range = 3;
      this.makeNpcMoveRandomly(
        delay,
        npc,
        this.background,
        this.map,
        this.obstacles,
        indX,
        range,
        indY
      );
    }
  }

  // npc random movement over time
  private makeNpcMoveRandomly(
    delay: number,
    npc: ServerWorldUnit,
    background: any,
    map: any,
    obstacles: any,
    indX: number,
    range: number,
    indY: number
  ) {
    // random offset before first movement so that all npcs don't move simultaneously
    const movingOffset = Math.floor(Math.random() * delay);
    let myInterval: any;
    setTimeout(() => {
      myInterval = setInterval(() => {
        // hidden npcs (in a fight) don't move
        if (npc.isVisible) {
          let nearbyTiles: Position[] = [];
          // first calculate the accessible tiles around npc
          for (let i = 0; i < background.tiles.length; i++) {
            let tileX = i % map.width;
            let tileY = Math.floor(i / map.width);
            if (
              obstacles.tileAt(tileX, tileY) === undefined &&
              tileX >= indX - range &&
              tileY >= indY - range &&
              tileX <= indX + range &&
              tileY <= indY + range
            ) {
              nearbyTiles.push({ indX: tileX, indY: tileY });
            }
          }

          // then chooses one randomly
          const randMove = Math.floor(Math.random() * (nearbyTiles.length - 1));
          const startVec: Vector2 = { x: npc.indX, y: npc.indY };
          const targetVec: Vector2 = {
            x: nearbyTiles[randMove].indX,
            y: nearbyTiles[randMove].indY,
          };

          // only move if there is actually a path to the destination
          if (findPath(startVec, targetVec, background, obstacles)) {
            npc.indX = nearbyTiles[randMove].indX;
            npc.indY = nearbyTiles[randMove].indY;
            this.io.to("world").emit("npcMoved", npc);
          }
        }
      }, delay);
    }, movingOffset);
  }

  addNewPlayer(newPlayer: ServerWorldUnit, socket) {
    this.players.push(newPlayer);
    // send the players object to the new player
    socket.emit("currentPlayers", this.players);
    // send the npcs object to the new player
    socket.emit("currentNpcs", this.npcs);
    // update all other players of the new player
    socket.broadcast.to("world").emit("newPlayer", newPlayer);
  }

  removePlayer(socket) {
    const index = this.players.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
    // emit a message to all players to remove this player
    this.io.to("world").emit("playerDisconnect", socket.id);
  }

  removePlayerFromBattles(socket) {
    this.ongoingBattles.forEach((battle) => {
      battle.removeUnitFromBattle(socket.id);
    });
  }

  hideEnemyAndShowBattleIcon(enemyId: string) {
    const index = this.npcs.findIndex((npc) => npc.id === enemyId);
    let myNpc: ServerWorldUnit;
    if (index !== -1) {
      myNpc = this.npcs[index];
      myNpc.isVisible = false;
      // emit a message to all players to hide this npc during the fight
      this.io.to("world").emit("npcHidden", enemyId);
      // emit a message to all players to show battle icon in place of the npc that just got into a fight
      this.io.to("world").emit("addBattleIcon", myNpc);
    }
  }

  findCurrentPlayer(socket) {
    return this.players.find((player) => player.id === socket.id);
  }
}
