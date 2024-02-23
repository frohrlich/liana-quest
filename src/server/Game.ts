import { ServerWorldScene } from "./scenes/ServerWorldScene";
import { availableServerWorldMaps } from "./data/ServerWorldData";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import UserModel from "./models/userModel";
dotenv.config(); // Load environment variables from .env file

export class Game {
  serverWorldScenes: ServerWorldScene[] = [];
  io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  start() {
    // get world maps info and create actual world scene instances from it
    availableServerWorldMaps.forEach((worldMapData) => {
      this.serverWorldScenes.push(new ServerWorldScene(this, worldMapData));
    });

    // Here's how the connection process works
    // 1) Server listens for client socket connections and authenticates them.
    // 2) Server setups listeners for client messages, and when it's done doing that,
    //    it tells the client it's ready to receive its messages by sending it
    //    the 'serverIsReady' message.
    // 3) During this time, client loads the world scene. When it's ready to receive info
    //    from the server (when scene preupdate is reached), it starts listening to the
    //    'serverIsReady' message. When it receives it, it sends the 'worldSceneIsReady'
    //    message in return.
    // 4) Upon receiving the 'worldSceneIsReady' message, the server sends all game info
    //    to the client.
    this.io
      .use(async (socket, next) => {
        // authentication
        if (socket.handshake.query && socket.handshake.query.token) {
          jwt.verify(
            socket.handshake.query.token as string,
            process.env.TOKEN_SECRET,
            async (err, decoded) => {
              if (err) {
                return next(new Error("Authentication error"));
              }
              // verify that user is not already connected
              const sockets = await this.io.fetchSockets();
              if (
                sockets.find((mySocket) => {
                  return mySocket.data.user._id === decoded["user"]._id;
                })
              ) {
                return next(new Error("Authentication error"));
              }
              socket.data.user = decoded["user"];
              next();
            }
          );
        } else {
          next(new Error("Authentication error"));
        }
      })
      .on("connection", async (socket) => {
        // fetch user info in the database
        const user = await UserModel.findById(socket.data.user._id);
        // on connection, add player to first world scene of the array (our starter scene)
        if (user) {
          socket.data.user = user;
          const randomColor = Math.floor(Math.random() * 16777215);
          this.sendPlayerToWorldScene(
            socket,
            user.mapName,
            randomColor,
            "Amazon"
          );
        }
      });
  }

  findServerWorldSceneByName = (name: string) => {
    return this.serverWorldScenes.find(
      (worldScene) => worldScene.mapName === name
    );
  };

  async savePlayerPosition(
    socket: Socket,
    indX: number,
    indY: number,
    mapName: string
  ) {
    await UserModel.findByIdAndUpdate(
      { _id: socket.data.user._id },
      { indX: indX, indY: indY, mapName: mapName }
    );
  }

  sendPlayerToWorldScene(
    socket: Socket,
    destination: string,
    tint: number,
    type: string
  ) {
    const worldSceneDestination = this.findServerWorldSceneByName(destination);
    if (worldSceneDestination) {
      worldSceneDestination.addNewPlayerToScene(socket, tint, type);
      socket.emit("playerGoToMap", worldSceneDestination.mapName);
    }
  }
}
