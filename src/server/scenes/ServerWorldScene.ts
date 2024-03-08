import findPath, { Vector2 } from "../utils/findPath";
import { Server, Socket } from "socket.io";
import { ServerBattleScene } from "./ServerBattleScene";
import { v4 as uuidv4 } from "uuid";
import { ServerWorldData } from "../data/ServerWorldData";
import { findWorldMapByName } from "../../client/data/WorldData";
import { Game } from "../Game";

export interface ServerWorldUnit {
  id: string;
  indX: number;
  indY: number;
  direction: string;
  type: string;
  name: string;
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
  private readonly npcMovingDelay = 11000;
  private readonly npcMovingRange = 3;

  enemyCount: number;
  enemyMinPosition: number; // min starter position for enemies (distance from upper left corner)
  enemyMaxPosition: number; // max starter position for enemies
  enemyType: string;

  game: Game;
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
  playerStarterPosition: Position;
  roomId: string;
  mapName: string;
  transparentObstacles: any;

  constructor(game: Game, worldData: ServerWorldData) {
    this.game = game;
    this.io = game.io;
    this.enemyCount = worldData.enemyCount;
    this.enemyMinPosition = worldData.enemyMinPosition;
    this.enemyMaxPosition = worldData.enemyMaxPosition;
    this.enemyType = worldData.enemyType;
    this.playerStarterPosition = worldData.playerStarterPosition;
    this.roomId = uuidv4(); // room for sockets to join or leave
    this.mapName = worldData.mapName;

    this.createMap();
  }

  addNewPlayerToScene(socket: Socket) {
    const newPlayer: ServerWorldUnit = {
      indX: socket.data.user.indX ?? this.playerStarterPosition.indX,
      indY: socket.data.user.indY ?? this.playerStarterPosition.indY,
      id: socket.id,
      type: socket.data.user.type,
      name: socket.data.user.username,
      direction: "down",
      isVisible: true,
      tint: socket.data.user.color,
      isPlayable: true,
    };

    // create a new player and add it to our players object
    this.addNewPlayer(newPlayer, socket);

    this.listenToSceneEvents(socket, this.io);
  }

  private listenToSceneEvents(socket: Socket, io: Server) {
    if (socket.data.user.type) {
      socket.removeAllListeners();
    }

    socket.on("startBattle", (enemyId: string) => {
      const myPlayer = this.findCurrentPlayer(socket);
      const myNpc = this.findNpcById(enemyId);
      if (myNpc && myNpc.isVisible && myPlayer) {
        this.game.savePlayerPosition(
          socket,
          myPlayer.indX,
          myPlayer.indY,
          this.mapName
        );
        socket.leave(this.roomId);
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
        const challengedPlayerSocket = this.findSocketById(challengedPlayer.id);
        this.game.savePlayerPosition(
          socket,
          myPlayer.indX,
          myPlayer.indY,
          this.mapName
        );
        this.game.savePlayerPosition(
          challengedPlayerSocket,
          challengedPlayer.indX,
          challengedPlayer.indY,
          this.mapName
        );

        socket.leave(this.roomId);
        challengedPlayerSocket.leave(this.roomId);

        this.movePlayerToBattle(socket);
        this.movePlayerToBattle(challengedPlayerSocket);

        const battleId = uuidv4();
        socket.join(battleId);
        challengedPlayerSocket.join(battleId);

        this.ongoingBattles.push(
          new ServerBattleScene(this, io, myPlayer, challengedPlayer, battleId)
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
          (battle) => battle.roomId === myBattleIcon.battleId
        );
        if (myBattle && myBattle.isInPreparationMode) {
          const myPlayer = this.findCurrentPlayer(socket);
          this.movePlayerToBattle(socket);
          socket.leave(this.roomId);
          socket.join(myBattle.roomId);
          myBattle.addPlayerAfterBattleStart(myPlayer, myBattleIcon.isTeamA);
        }
      }
    });

    socket.on("disconnect", () => {
      const currentPlayer = this.findCurrentPlayer(socket);
      if (currentPlayer) {
        this.game.savePlayerPosition(
          socket,
          currentPlayer.indX,
          currentPlayer.indY,
          this.mapName
        );
      }
      this.removePlayer(socket);
      this.removePlayerFromBattles(socket);
    });

    socket.on("worldSceneIsReady", () => {
      if (this.findSocketById(socket.id)) {
        // send the players object to the new player
        socket.emit("currentPlayers", this.players);
        // send the npcs object to the new player
        socket.emit("currentNpcs", this.npcs);
        // send the battleIcons object to the new player
        socket.emit("currentBattleIcons", this.battleIcons);
        // make it listen to world events
        socket.join(this.roomId);
      }
    });

    socket.on("enemyKill", (enemyId: string) => {
      const index = this.npcs.findIndex((npc) => npc.id === enemyId);
      if (index !== -1) {
        this.npcs.splice(index, 1);
      }
      // emit a message to all players to remove this player
      io.to(this.roomId).emit("enemyWasKilled", enemyId);
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
          this.obstacles,
          this.transparentObstacles
        );
        if (path && path.length > 0) {
          currentPlayer.indX = movementData.indX;
          currentPlayer.indY = movementData.indY;
        }
        // emit a message to all players about the player that moved
        io.to(this.roomId).emit("playerMoved", currentPlayer);
      }
    });

    socket.on("updateDirection", (direction: string) => {
      const currentPlayer = this.findCurrentPlayer(socket);
      if (currentPlayer) {
        currentPlayer.direction = direction;
      }
    });

    socket.on("goToMap", (destination: string) => {
      if (this.canAnyNpcInCurrentMapSendPlayersToThisDestination(destination)) {
        this.sendPlayerToOtherWorldScene(socket, destination);
      }
    });

    socket.on("newChatMessageSent", (message: string) => {
      const currentPlayer = this.findCurrentPlayer(socket);
      if (currentPlayer) {
        this.io
          .to(this.roomId)
          .emit(
            "newChatMessageWasSent",
            currentPlayer.name,
            escapeHtml(message)
          );
      }
    });

    // we tell client that the server is ready to receive incoming messages
    socket.emit("serverIsReady");
  }

  sendPlayerToOtherWorldScene(socket: Socket, destination: string) {
    const worldSceneDestination =
      this.game.findServerWorldSceneByName(destination);
    const currentPlayer = this.findCurrentPlayer(socket);
    if (worldSceneDestination && currentPlayer) {
      this.removePlayer(socket);
      socket.leave(this.roomId);
      this.changeSocketUserMap(socket, destination);
      worldSceneDestination.addNewPlayerToScene(socket);
      socket.emit("playerGoToMap", worldSceneDestination.mapName);
    }
  }

  private changeSocketUserMap(socket: Socket, mapName: string) {
    socket.data.user.indX = null;
    socket.data.user.indY = null;
    socket.data.user.mapName = mapName;
  }

  private canAnyNpcInCurrentMapSendPlayersToThisDestination(
    destination: string
  ) {
    return findWorldMapByName(this.mapName).npcs.find(
      (npc) => npc.dialog.responseDestination === destination
    );
  }

  makeNpcVisibleAgain(npcId: string) {
    const index = this.npcs.findIndex((npc) => npc.id === npcId);
    if (index !== -1) {
      this.npcs[index].isVisible = true;
    }
    // emit a message to all players to make this npc visible again
    this.io.to(this.roomId).emit("npcWonFight", npcId);
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

    tmx.parseFile(
      "./public/assets/map/" + this.mapName + "_map.tmx",
      (err, map) => {
        if (err) throw err;
        this.map = map;
        this.background = map.layers[0];
        this.obstacles = map.layers[1];
        this.transparentObstacles = map.layers[2];

        // create npcs at random locations
        this.createRandomNpcs();
      }
    );
  }

  private createRandomNpcs() {
    const freeTiles = this.getFreeTiles();
    for (let i = 0; i < this.enemyCount; i++) {
      const id = uuidv4();
      let randPosition: Position;
      do {
        const randIndex = Math.floor(Math.random() * freeTiles.length);
        randPosition = freeTiles[randIndex];
      } while (
        randPosition.indX < this.enemyMinPosition ||
        randPosition.indY < this.enemyMinPosition ||
        randPosition.indX > this.enemyMaxPosition ||
        randPosition.indY > this.enemyMaxPosition
      );

      // let enemyTint = Math.floor(Math.random() * 16777215);
      let enemyTint = 0xffffff;

      const npc: ServerWorldUnit = {
        indX: randPosition.indX,
        indY: randPosition.indY,
        type: this.enemyType,
        name: this.enemyType,
        id: id,
        direction: "down",
        isVisible: true,
        tint: enemyTint,
        isPlayable: false,
      };
      this.npcs.push(npc);

      this.makeNpcMoveRandomly(
        this.npcMovingDelay,
        npc,
        this.background,
        this.map,
        this.obstacles,
        this.transparentObstacles,
        randPosition.indX,
        this.npcMovingRange,
        randPosition.indY
      );
    }
  }

  /** Returns tiles that are not obstacles. */
  getFreeTiles() {
    const freePositions: Position[] = [];
    for (let indX = 0; indX < this.map.width; indX++) {
      for (let indY = 0; indY < this.map.height; indY++) {
        if (
          this.background.tileAt(indX, indY) &&
          !this.obstacles.tileAt(indX, indY) &&
          !this.transparentObstacles.tileAt(indX, indY)
        ) {
          freePositions.push({ indX: indX, indY: indY });
        }
      }
    }
    return freePositions;
  }

  private makeNpcMoveRandomly(
    delay: number,
    npc: ServerWorldUnit,
    background: any,
    map: any,
    obstacles: any,
    transparentObstacles: any,
    indX: number,
    range: number,
    indY: number
  ) {
    // random offset before first movement so that all npcs don't move simultaneously
    const movingOffset = Math.floor(Math.random() * 2 * delay);
    setTimeout(() => {
      setInterval(() => {
        // hidden npcs (in a fight) don't move
        // also, npcs on empty maps don't need to move until someone is actually there
        if (npc.isVisible && this.players.length > 0) {
          let nearbyTiles: Position[] = [];
          // first calculate the accessible tiles around npc
          for (let i = 0; i < background.tiles.length; i++) {
            let tileX = i % map.width;
            let tileY = Math.floor(i / map.width);
            if (
              !obstacles.tileAt(tileX, tileY) &&
              !transparentObstacles.tileAt(tileX, tileY) &&
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

          const path = findPath(
            startVec,
            targetVec,
            background,
            obstacles,
            transparentObstacles
          );
          // only move if there is actually a path to the destination
          if (path && path.length > 0) {
            npc.indX = nearbyTiles[randMove].indX;
            npc.indY = nearbyTiles[randMove].indY;
            this.io.to(this.roomId).emit("npcMoved", npc, path);
          }
        }
      }, delay);
    }, movingOffset);
  }

  addNewPlayer(newPlayer: ServerWorldUnit, socket: Socket) {
    this.players.push(newPlayer);
    this.sockets.push(socket);

    // update all other players of the new player
    socket.broadcast.to(this.roomId).emit("newPlayer", newPlayer);
  }

  removePlayer(socket: Socket) {
    let index = this.players.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
    index = this.sockets.findIndex((mySocket) => mySocket.id === socket.id);
    if (index !== -1) {
      this.sockets.splice(index, 1);
    }
    // emit a message to all players to remove this player
    this.io.to(this.roomId).emit("playerLeft", socket.id);
  }

  movePlayerToBattle(socket: Socket) {
    const index = this.players.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      this.playersCurrentlyInBattle.push(this.players[index]);
      this.players.splice(index, 1);
    }
    // emit a message to all players to remove this player
    this.io.to(this.roomId).emit("playerLeft", socket.id);
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
    socket.broadcast.to(this.roomId).emit("newPlayer", newPlayer);
  }

  removePlayerFromBattles(socket: Socket) {
    this.ongoingBattles.forEach((battle) => {
      battle.removeCompletelyUnitFromBattle(socket.id);
      socket.leave(battle.roomId);
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
      (battle) => battle.roomId === battleId
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
        this.io.to(this.roomId).emit("removeBattleIcon", myBattleIcon.id);
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
      this.io.to(this.roomId).emit("npcHidden", enemyId);
      // emit a message to all players to show battle icon in place of the npc that just got into a fight
      this.io.to(this.roomId).emit("addBattleIcon", myNpc, myBattleIcon.id);
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
        .to(this.roomId)
        .emit(
          "addChallengeBattleIcons",
          myPlayer,
          myChallengedPlayer,
          myPlayerBattleIcon.id,
          myChallengedPlayerBattleIcon.id
        );
    }
  }

  findCurrentPlayer(socket: Socket) {
    return this.players.find((player) => player.id === socket.id);
  }

  findSocketById(id: string) {
    return this.sockets.find((socket) => socket.id === id);
  }
}

const entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

export const escapeHtml = (str: string) => {
  return String(str).replace(/[&<>"'`=\/]/g, (s) => {
    return entityMap[s];
  });
};
