import express, { Express, Request, Response, Application } from "express";
import { Server } from "socket.io";
import * as http from "http";

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
  newPlayer: (onlinePlayer: OnlinePlayer) => void;
  playerDisconnect: (id: string) => void;
  playerMoved: (onlinePlayer: OnlinePlayer) => void;
}

interface ClientToServerEvents {
  playerMovement: (movementData: Position) => void;
  updateDirection: (direction: string) => void;
  updatePosition: (position: Position) => void;
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
  };
  // create a new player and add it to our players object
  players.push(newPlayer);
  // send the players object to the new player
  socket.emit("currentPlayers", players);
  // update all other players of the new player
  socket.broadcast.emit("newPlayer", newPlayer);

  socket.on("disconnect", function () {
    // remove this player from our players object
    const index = players.findIndex((player) => player.playerId === socket.id);
    if (index !== -1) {
      players.splice(index, 1);
    }
    // emit a message to all players to remove this player
    io.emit("playerDisconnect", socket.id);
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
    currentPlayer.direction = direction;
  });

  socket.on("updatePosition", function (position: Position) {
    const currentPlayer = findCurrentPlayer(socket);
    currentPlayer.indX = position.indX;
    currentPlayer.indY = position.indY;
  });
});

server.listen(port, function () {
  console.log(`Listening on ${port}`);
});

function findCurrentPlayer(socket) {
  return players.find((player) => player.playerId === socket.id);
}
