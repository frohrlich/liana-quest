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
}

interface Position {
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
  enemyWasKilled: (id: string) => void;
  playerVisibilityChanged: (id: string, isVisible: boolean) => void;
}

interface ClientToServerEvents {
  playerMovement: (movementData: Position) => void;
  enemyKill: (id: string) => void;
  updateDirection: (direction: string) => void;
  updatePosition: (position: Position) => void;
  startBattle: (enemyId: string) => void;
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

tmx.parseFile("./assets/map/map.tmx", function (err, map) {
  if (err) throw err;
  const background = map.layers[0];
  const obstacles = map.layers[1];

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
        npc.indX = nearbyTiles[randMove].indX;
        npc.indY = nearbyTiles[randMove].indY;
        io.emit("npcMoved", npc);
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
    visibility: true,
  };
  // create a new player and add it to our players object
  addNewPlayer(newPlayer, socket);

  socket.on("startBattle", (enemyId: string) => {
    removePlayer(socket);
    hideEnemy(enemyId);
  });

  // plays when player returns from battle to world scene
  socket.on("endBattle", (player: OnlinePlayer) => {
    addNewPlayer(player, socket);
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
    io.emit("enemyWasKilled", enemyId);
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData: Position) {
    const currentPlayer = findCurrentPlayer(socket);
    currentPlayer.indX = movementData.indX;
    currentPlayer.indY = movementData.indY;
    // emit a message to all players about the player that moved
    io.emit("playerMoved", currentPlayer);
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
  socket.broadcast.emit("newPlayer", newPlayer);
}

function removePlayer(socket) {
  const index = players.findIndex((player) => player.playerId === socket.id);
  if (index !== -1) {
    players.splice(index, 1);
  }
  // emit a message to all players to remove this player
  io.emit("playerDisconnect", socket.id);
}

function hideEnemy(enemyId: string) {
  const index = npcs.findIndex((npc) => npc.playerId === enemyId);
  if (index !== -1) {
    npcs.splice(index, 1);
  }
  // emit a message to all players to hide this npc during the fight
  io.emit("npcHidden", enemyId);
}

function findCurrentPlayer(socket) {
  return players.find((player) => player.playerId === socket.id);
}
