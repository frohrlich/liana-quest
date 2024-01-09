import findPath, { Vector2 } from "../utils/findPath";
import { Server, Socket } from "socket.io";
import { ServerBattleScene } from "./ServerBattleScene";
import { v4 as uuidv4 } from "uuid";

export interface ServerWorldUnit {
  id: string;
  indX: number;
  indY: number;
  direction: string;
  type: string;
  isVisible: boolean;
  tint: integer;
  isPlayable: boolean;
}

export interface Position {
  indX: number;
  indY: number;
}

export interface ServerBattleIcon {
  battleId: string;
  indX: number;
  indY: number;
  id: string;
  isChallenge: boolean;
  isTeamA: boolean;
}

export class ServerWorldScene {
  enemyCount = 10;
  minPosition = 5; // min starter position for enemies (distance from upper left corner)
  maxPosition = 999; // max starter position for enemies

  players: ServerWorldUnit[] = [];
  sockets: Socket[] = [];
  playersCurrentlyInBattle: ServerWorldUnit[] = [];
  npcs: ServerWorldUnit[] = [];
  battleIcons: ServerBattleIcon[] = [];
  ongoingBattles: ServerBattleScene[] = [];
  io: Server;
  background: any;
  obstacles: any;
  map: any;

  constructor(io: Server) {
    this.io = io;

    this.createMap();

    io.on("connection", (socket) => {
      let randomColor = Math.floor(Math.random() * 16777215);

      const newPlayer = {
        indX: Math.floor(Math.random() * 5) + 1,
        indY: Math.floor(Math.random() * 5) + 1,
        id: socket.id,
        type: "Amazon",
        direction: "down",
        isVisible: true,
        tint: randomColor,
        isPlayable: true,
      };

      // create a new player and add it to our players object
      this.addNewPlayer(newPlayer, socket);

      socket.on("startBattle", (enemyId: string) => {
        const myPlayer = this.findCurrentPlayer(socket);
        const myNpc = this.findNpcById(enemyId);
        if (myNpc && myNpc.isVisible && myPlayer) {
          socket.leave("world");
          this.movePlayerToBattle(socket);
          const battleId = uuidv4();
          socket.join(battleId);
          this.ongoingBattles.push(
            new ServerBattleScene(this, io, myPlayer, myNpc, battleId)
          );
          this.hideEnemyAndCreateBattleIcon(enemyId, battleId);
        }
      });

      socket.on("startChallenge", (challengedPlayerId: string) => {
        const myPlayer = this.findCurrentPlayer(socket);
        const challengedPlayer = this.findPlayerById(challengedPlayerId);
        if (challengedPlayer && myPlayer) {
          const challengedPlayerSocket = this.findSocketById(
            challengedPlayer.id
          );

          socket.leave("world");
          challengedPlayerSocket.leave("world");

          this.movePlayerToBattle(socket);
          this.movePlayerToBattle(challengedPlayerSocket);

          const battleId = uuidv4();
          socket.join(battleId);
          challengedPlayerSocket.join(battleId);

          this.ongoingBattles.push(
            new ServerBattleScene(
              this,
              io,
              myPlayer,
              challengedPlayer,
              battleId
            )
          );
          this.createChallengeBattleIcons(
            socket.id,
            challengedPlayerId,
            battleId
          );
        }
      });

      socket.on("playerClickedBattleIcon", (id: string) => {
        const myBattleIcon = this.findBattleIconById(id);
        if (myBattleIcon) {
          const myBattle = this.ongoingBattles.find(
            (battle) => battle.id === myBattleIcon.battleId
          );
          if (myBattle && myBattle.isInPreparationMode) {
            const myPlayer = this.findCurrentPlayer(socket);
            this.movePlayerToBattle(socket);
            socket.leave("world");
            socket.join(myBattle.id);
            myBattle.addPlayerAfterBattleStart(myPlayer, myBattleIcon.isTeamA);
          }
        }
      });

      socket.on("disconnect", () => {
        this.removePlayer(socket);
        this.removePlayerFromBattles(socket);
      });

      socket.on("worldSceneIsReady", () => {
        // send the players object to the new player
        socket.emit("currentPlayers", this.players);
        // send the npcs object to the new player
        socket.emit("currentNpcs", this.npcs);
        // send the battleIcons object to the new player
        socket.emit("currentBattleIcons", this.battleIcons);
        // make it listen to world events
        socket.join("world");
      });

      socket.on("enemyKill", (enemyId: string) => {
        const index = this.npcs.findIndex((npc) => npc.id === enemyId);
        if (index !== -1) {
          this.npcs.splice(index, 1);
        }
        // emit a message to all players to remove this player
        io.to("world").emit("enemyWasKilled", enemyId);
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
          const path = findPath(
            startVec,
            targetVec,
            this.background,
            this.obstacles
          );
          if (path && path.length > 0) {
            currentPlayer.indX = movementData.indX;
            currentPlayer.indY = movementData.indY;
            // emit a message to all players about the player that moved
            io.to("world").emit("playerMoved", currentPlayer, path);
          }
        }
      });

      socket.on("updateDirection", (direction: string) => {
        const currentPlayer = this.findCurrentPlayer(socket);
        if (currentPlayer) {
          currentPlayer.direction = direction;
        }
      });
    });
  }

  makeNpcVisibleAgain(npcId: string) {
    const index = this.npcs.findIndex((npc) => npc.id === npcId);
    if (index !== -1) {
      this.npcs[index].isVisible = true;
    }
    // emit a message to all players to make this npc visible again
    this.io.to("world").emit("npcWonFight", npcId);
  }

  findBattleIconById(id: string) {
    return this.battleIcons.find((icon) => icon.id === id);
  }

  private findNpcById(enemyId: string) {
    return this.npcs.find((npc) => npc.id === enemyId);
  }

  private findPlayerById(playerId: string) {
    return this.players.find((player) => player.id === playerId);
  }

  private findPlayerInBattlesById(playerId: string) {
    return this.playersCurrentlyInBattle.find(
      (player) => player.id === playerId
    );
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
      const id = uuidv4();
      let indX: number, indY: number;
      const myMaxPositionX = Math.min(this.maxPosition, this.map.width);
      const myMaxPositionY = Math.min(this.maxPosition, this.map.height);
      do {
        indX =
          Math.floor(Math.random() * (myMaxPositionX - this.minPosition)) +
          this.minPosition;
        indY =
          Math.floor(Math.random() * (myMaxPositionY - this.minPosition)) +
          this.minPosition;
      } while (this.obstacles.tileAt(indX, indY)); // not on obstacles

      // let randomColor = Math.floor(Math.random() * 16777215);
      let randomColor = 0xffffff;

      // toss a coin between snowman and dude...
      const enemyType = Math.floor(Math.random() * 2) ? "Snowman" : "Dude";
      const npc: ServerWorldUnit = {
        indX: indX,
        indY: indY,
        type: enemyType,
        id: id,
        direction: "down",
        isVisible: true,
        tint: randomColor,
        isPlayable: false,
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
    setTimeout(() => {
      setInterval(() => {
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

          const path = findPath(startVec, targetVec, background, obstacles);
          // only move if there is actually a path to the destination
          if (path && path.length > 0) {
            npc.indX = nearbyTiles[randMove].indX;
            npc.indY = nearbyTiles[randMove].indY;
            this.io.to("world").emit("npcMoved", npc, path);
          }
        }
      }, delay);
    }, movingOffset);
  }

  addNewPlayer(newPlayer: ServerWorldUnit, socket: Socket) {
    this.players.push(newPlayer);
    this.sockets.push(socket);
    // update all other players of the new player
    socket.broadcast.to("world").emit("newPlayer", newPlayer);
  }

  removePlayer(socket: Socket) {
    const index = this.players.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
    // emit a message to all players to remove this player
    this.io.to("world").emit("playerLeft", socket.id);
  }

  movePlayerToBattle(socket: Socket) {
    const index = this.players.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      this.playersCurrentlyInBattle.push(this.players[index]);
      this.players.splice(index, 1);
    }
    // emit a message to all players to remove this player
    this.io.to("world").emit("playerLeft", socket.id);
  }

  movePlayerBackToWorld(socket: Socket) {
    let newPlayer;
    const index = this.playersCurrentlyInBattle.findIndex(
      (player) => player.id === socket.id
    );
    if (index !== -1) {
      newPlayer = this.playersCurrentlyInBattle[index];
      this.players.push(newPlayer);
      this.playersCurrentlyInBattle.splice(index, 1);
    }

    // update all other players of the new player
    socket.broadcast.to("world").emit("newPlayer", newPlayer);
  }

  removePlayerFromBattles(socket: Socket) {
    this.ongoingBattles.forEach((battle) => {
      battle.removeCompletelyUnitFromBattle(socket.id);
      socket.leave(battle.id);
    });
    const index = this.playersCurrentlyInBattle.findIndex(
      (player) => player.id === socket.id
    );
    if (index !== -1) {
      this.playersCurrentlyInBattle.splice(index, 1);
    }
  }

  removeBattle(battleId: string) {
    const index = this.ongoingBattles.findIndex(
      (battle) => battle.id === battleId
    );
    if (index !== -1) {
      this.ongoingBattles.splice(index, 1);
    }
  }

  removeBattleIcons(battleId: string) {
    let i = this.battleIcons.length;
    while (i--) {
      const myBattleIcon = this.battleIcons[i];
      if (myBattleIcon.battleId === battleId) {
        this.io.to("world").emit("removeBattleIcon", myBattleIcon.id);
        this.battleIcons.splice(i, 1);
      }
    }
  }

  hideEnemyAndCreateBattleIcon(enemyId: string, battleId: string) {
    const myNpc = this.findNpcById(enemyId);
    if (myNpc) {
      myNpc.isVisible = false;
      const myBattleIcon: ServerBattleIcon = {
        indX: myNpc.indX,
        indY: myNpc.indY,
        battleId: battleId,
        isChallenge: false,
        isTeamA: true,
        id: uuidv4(),
      };
      // emit a message to all players to hide this npc during the fight
      this.io.to("world").emit("npcHidden", enemyId);
      // emit a message to all players to show battle icon in place of the npc that just got into a fight
      this.io.to("world").emit("addBattleIcon", myNpc, myBattleIcon.id);
      this.battleIcons.push(myBattleIcon);
    }
  }

  createChallengeBattleIcons(
    playerId: string,
    challengedPlayerId: string,
    battleId: string
  ) {
    const myPlayer = this.findPlayerInBattlesById(playerId);
    const myChallengedPlayer = this.findPlayerInBattlesById(challengedPlayerId);
    if (myPlayer && myChallengedPlayer) {
      const myPlayerBattleIcon: ServerBattleIcon = {
        indX: myPlayer.indX,
        indY: myPlayer.indY,
        battleId: battleId,
        isChallenge: true,
        isTeamA: true,
        id: uuidv4(),
      };
      const myChallengedPlayerBattleIcon: ServerBattleIcon = {
        indX: myChallengedPlayer.indX,
        indY: myChallengedPlayer.indY,
        battleId: battleId,
        isChallenge: true,
        isTeamA: false,
        id: uuidv4(),
      };
      this.battleIcons.push(myPlayerBattleIcon, myChallengedPlayerBattleIcon);
      // emit a message to all players to show battle icons in place of the players that just got into a fight
      this.io
        .to("world")
        .emit(
          "addChallengeBattleIcons",
          myPlayer,
          myChallengedPlayer,
          myPlayerBattleIcon.id,
          myChallengedPlayerBattleIcon.id
        );
    }
  }

  findCurrentPlayer(socket) {
    return this.players.find((player) => player.id === socket.id);
  }

  findSocketById(id: string) {
    return this.sockets.find((socket) => socket.id === id);
  }
}
