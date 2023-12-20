import express, { Express, Request, Response, Application } from "express";
import { Server, Socket } from "socket.io";
import * as http from "http";
import {
  OnlinePlayer,
  Position,
  ServerWorldScene,
} from "./scenes/ServerWorldScene";
import { ServerUnit } from "./scenes/ServerBattleScene";

const port = 8081;

interface ServerToClientEvents {
  // world events
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

  // battle events
  battleHasStarted: (
    allies: ServerUnit[],
    enemies: ServerUnit[],
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
  endBattle: (player: OnlinePlayer) => void;
  playerClickedBattleIcon: (npcId: string) => void;

  // battle events
  playerChangedStartPosition: (playerId: string, position: Position) => void;
}

const app: Application = express();
const server = new http.Server(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

app.use(express.static("./"));

app.get("/", function (req, res) {
  res.sendFile("/public/index.html", { root: "./" });
});

server.listen(process.env.PORT || port, function () {
  console.log(`Listening on ${port}`);
});

const worldScene = new ServerWorldScene(io);
