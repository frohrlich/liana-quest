import express, { Express, Request, Response, Application } from "express";
import { Server, Socket } from "socket.io";
import * as http from "http";
import findPath, { Vector2 } from "./utils/findPath";

const port = 8081;

export interface OnlinePlayer {
  playerId: string;
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

interface ServerToClientEvents {
  currentPlayers: (onlinePlayer: OnlinePlayer[]) => void;
  currentNpcs: (npcs: OnlinePlayer[]) => void;
  newPlayer: (onlinePlayer: OnlinePlayer) => void;
  playerDisconnect: (id: string) => void;
  playerMoved: (onlinePlayer: OnlinePlayer) => void;
  npcMoved: (onlinePlayer: OnlinePlayer) => void;
  npcHidden: (id: string) => void;
  addBattleIcon: (id: OnlinePlayer) => void;
  removeBattleIcon: (id: string) => void;
  enemyWasKilled: (id: string) => void;
  npcWonFight: (id: string) => void;
  playerVisibilityChanged: (id: string, isVisible: boolean) => void;
}

interface ClientToServerEvents {
  playerMovement: (movementData: Position) => void;
  enemyKill: (id: string) => void;
  npcWinFight: (id: string) => void;
  updateDirection: (direction: string) => void;
  updatePosition: (position: Position) => void;
  startBattle: (enemyId: string) => void;
  fightPreparationIsOver: (enemyId: string) => void;
  endBattle: (player: OnlinePlayer) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

const app: Application = express();
const server = new http.Server(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server);

let players: OnlinePlayer[] = [];
let npcs: OnlinePlayer[] = [];
const enemyCount = 30;
const minPosition = 5;

// load map
let tmx = require("tmx-parser");
let background;
let obstacles;

tmx.parseFile("./public/assets/map/map.tmx", function (err, map) {
  if (err) throw err;
  background = map.layers[0];
  obstacles = map.layers[1];

  // create npcs at random locations
  for (let i = 0; i < enemyCount; i++) {
    const id = i.toString();
    let indX: number, indY: number;
    do {
      indX =
        Math.floor(Math.random() * (map.width - minPosition)) + minPosition;
      indY =
        Math.floor(Math.random() * (map.height - minPosition - 1)) +
        minPosition;
    } while (obstacles.tileAt(indX, indY)); // but not on obstacles
    // toss a coin between snowman and dude...
    const enemyType = Math.floor(Math.random() * 2) ? "Snowman" : "Dude";
    const npc: OnlinePlayer = {
      indX: indX,
      indY: indY,
      type: enemyType,
      playerId: id,
      direction: "down",
      isVisible: true,
    };
    npcs.push(npc);

    // npc random movement over time
    // random offset before first movement so that all npcs don't move simultaneously
    const delay = 10000;
    const range = 3;
    const movingOffset = Math.floor(Math.random() * delay);
    let myInterval: any;
    setTimeout(() => {
      myInterval = setInterval(function () {
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
            io.to("world").emit("npcMoved", npc);
          }
        }
      }, delay);
    }, movingOffset);
  }
});

app.use(express.static("./"));

app.get("/", function (req, res) {
  res.sendFile("/public/index.html", { root: "./" });
});

io.on("connection", function (socket) {
  const newPlayer = {
    indX: Math.floor(Math.random() * 5) + 1,
    indY: Math.floor(Math.random() * 5) + 1,
    playerId: socket.id,
    type: "Princess",
    direction: "down",
    isVisible: true,
  };

  socket.join("world");

  // create a new player and add it to our players object
  addNewPlayer(newPlayer, socket);

  socket.on("startBattle", (enemyId: string) => {
    removePlayer(socket);
    socket.leave("world");
    hideEnemyAndShowBattleIcon(enemyId);
  });

  // plays when player returns from battle to world scene
  socket.on("endBattle", (player: OnlinePlayer) => {
    addNewPlayer(player, socket);
    socket.join("world");
  });

  // is emitted when a fight has really started (preparation phase is over)
  // and players on the world scene cannot join it anymore
  socket.on("fightPreparationIsOver", (enemyId: string) => {
    io.to("world").emit("removeBattleIcon", enemyId);
  });

  socket.on("disconnect", () => {
    removePlayer(socket);
  });

  socket.on("enemyKill", function (enemyId: string) {
    const index = npcs.findIndex((npc) => npc.playerId === enemyId);
    if (index !== -1) {
      npcs.splice(index, 1);
    }
    // emit a message to all players to remove this player
    io.to("world").emit("enemyWasKilled", enemyId);
  });

  socket.on("npcWinFight", function (enemyId: string) {
    const index = npcs.findIndex((npc) => npc.playerId === enemyId);
    if (index !== -1) {
      npcs[index].isVisible = true;
    }
    // emit a message to all players to make this npc visible again
    io.to("world").emit("npcWonFight", enemyId);
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData: Position) {
    const currentPlayer = findCurrentPlayer(socket);

    const startVec: Vector2 = { x: currentPlayer.indX, y: currentPlayer.indY };
    const targetVec: Vector2 = {
      x: movementData.indX,
      y: movementData.indY,
    };

    // check if movement is actually possible
    if (findPath(startVec, targetVec, background, obstacles)) {
      currentPlayer.indX = movementData.indX;
      currentPlayer.indY = movementData.indY;
      // emit a message to all players about the player that moved
      io.to("world").emit("playerMoved", currentPlayer);
    }
  });

  socket.on("updateDirection", function (direction: string) {
    const currentPlayer = findCurrentPlayer(socket);
    if (currentPlayer) {
      currentPlayer.direction = direction;
    }
  });

  socket.on("updatePosition", function (position: Position) {
    const currentPlayer = findCurrentPlayer(socket);
    currentPlayer.indX = position.indX;
    currentPlayer.indY = position.indY;
  });
});

server.listen(process.env.PORT || port, function () {
  console.log(`Listening on ${port}`);
});

function addNewPlayer(newPlayer: OnlinePlayer, socket) {
  players.push(newPlayer);
  // send the players object to the new player
  socket.emit("currentPlayers", players);
  // send the npcs object to the new player
  socket.emit("currentNpcs", npcs);
  // update all other players of the new player
  socket.broadcast.to("world").emit("newPlayer", newPlayer);
}

function removePlayer(socket) {
  const index = players.findIndex((player) => player.playerId === socket.id);
  if (index !== -1) {
    players.splice(index, 1);
  }
  // emit a message to all players to remove this player
  io.to("world").emit("playerDisconnect", socket.id);
}

function hideEnemyAndShowBattleIcon(enemyId: string) {
  const index = npcs.findIndex((npc) => npc.playerId === enemyId);
  let myNpc: OnlinePlayer;
  if (index !== -1) {
    myNpc = npcs[index];
    myNpc.isVisible = false;
    // emit a message to all players to hide this npc during the fight
    io.to("world").emit("npcHidden", enemyId);
    // emit a message to all players to show battle icon in place of the npc that just got into a fight
    io.to("world").emit("addBattleIcon", myNpc);
  }
}

function findCurrentPlayer(socket) {
  return players.find((player) => player.playerId === socket.id);
}
