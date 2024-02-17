import express, { Application } from "express";
import { Server } from "socket.io";
import * as http from "http";
import { ServerWorldUnit, Position } from "./scenes/ServerWorldScene";
import { ServerUnit } from "./classes/ServerUnit";
import { Vector2 } from "./utils/findPath";
import { Game } from "./Game";
import dotenv from "dotenv";
import mongoose from "mongoose";
import routes from "./routes/main";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import passport from "passport";
dotenv.config(); // Load environment variables from .env file

const port = 8081;

interface ServerToClientEvents {
  // world events
  currentPlayers: (onlinePlayer: ServerWorldUnit[]) => void;
  currentNpcs: (npcs: ServerWorldUnit[]) => void;
  newPlayer: (onlinePlayer: ServerWorldUnit) => void;
  playerLeft: (id: string) => void;
  playerMoved: (onlinePlayer: ServerWorldUnit, path: Vector2[]) => void;
  npcMoved: (onlinePlayer: ServerWorldUnit, path: Vector2[]) => void;
  npcHidden: (id: string) => void;
  addBattleIcon: (id: ServerWorldUnit) => void;
  removeBattleIcon: (id: string) => void;
  enemyWasKilled: (id: string) => void;
  npcWonFight: (id: string) => void;
  playerVisibilityChanged: (id: string, isVisible: boolean) => void;

  // battle events
  battleHasStarted: (
    allies: ServerUnit[],
    enemies: ServerUnit[],
    timeline: ServerUnit[],
    mapName: string
  ) => void;
  playerHasChangedStartPosition: (playerId: string, position: Position) => void;
}

interface ClientToServerEvents {
  // world events
  playerMovement: (movementData: Position) => void;
  enemyKill: (id: string) => void;
  npcWinFight: (id: string) => void;
  updateDirection: (direction: string) => void;
  updatePosition: (position: Position) => void;
  startBattle: (enemyId: string) => void;
  fightPreparationIsOver: (enemyId: string) => void;
  endBattle: (player: ServerWorldUnit) => void;
  playerClickedBattleIcon: (id: string) => void;

  // battle events
  playerChangedStartPosition: (playerId: string, position: Position) => void;
}

// setup mongo connection
const uri = process.env.MONGO_CONNECTION_URL;
mongoose.connect(uri);
mongoose.connection.on("error", (error) => {
  console.log(error);
  process.exit(1);
});
mongoose.connection.on("connected", () => {
  console.log("connected to mongo");
});

const app: Application = express();
const server = new http.Server(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

// update express settings
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
// require passport auth
require("./auth/auth");

app.use(express.static("./"));

app.use("/", routes);

app.get("/game", function (req, res) {
  res.sendFile("/public/index.html", { root: "./" });
});

server.listen(process.env.PORT || port, function () {
  console.log(`Listening on ${port}`);
});

const myGame = new Game(io);
myGame.start();
