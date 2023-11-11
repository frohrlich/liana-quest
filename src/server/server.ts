import express, { Express, Request, Response, Application } from "express";
import { Server } from "socket.io";
import * as http from "http";

const port = 8081;

export interface OnlinePlayer {
  id: string;
  x: number;
  y: number;
}

interface Movement {
  x: number;
  y: number;
}

interface ServerToClientEvents {
  currentPlayers: (onlinePlayer: OnlinePlayer[]) => void;
  newPlayer: (onlinePlayer: OnlinePlayer) => void;
  playerDisconnect: (id: string) => void;
  playerMoved: (onlinePlayer: OnlinePlayer) => void;
}

interface ClientToServerEvents {
  playerMovement: (movementData: Movement) => void;
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
  console.log("a user connected");

  // create a new player and add it to our players object
  players[socket.id] = {
    x: Math.floor(Math.random() * 250),
    y: Math.floor(Math.random() * 250),
    playerId: socket.id,
  };
  // send the players object to the new player
  socket.emit("currentPlayers", players);
  // update all other players of the new player
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("disconnect", function () {
    console.log("user disconnected");
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit("playerDisconnect", socket.id);
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData: Movement) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });
});

server.listen(port, function () {
  console.log(`Listening on ${port}`);
});
