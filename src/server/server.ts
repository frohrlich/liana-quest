import express, { Express, Request, Response, Application } from "express";
import { Server } from "socket.io";
import * as http from "http";

const port = 8081;

export interface OnlinePlayer {
  playerId: string;
  indX: number;
  indY: number;
  type: string;
}

interface Movement {
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
    indX: Math.floor(Math.random() * 10),
    indY: Math.floor(Math.random() * 10),
    playerId: socket.id,
    type: "Princess",
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
    players[socket.id].indX = movementData.indX;
    players[socket.id].indY = movementData.indY;
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });
});

server.listen(port, function () {
  console.log(`Listening on ${port}`);
});
