import { Server, Socket } from "socket.io";
import {
  ServerWorldUnit,
  Position,
  ServerWorldScene,
} from "./ServerWorldScene";
import { unitsAvailable } from "../../client/data/UnitData";
import { ServerUnit } from "../classes/ServerUnit";
import findPath, { Vector2 } from "../utils/findPath";
import { Spell } from "../../client/classes/battle/Spell";
import isVisible from "../utils/lineOfSight";
import { v4 as uuidv4 } from "uuid";

export interface ServerTilePath {
  pos: Vector2;
  path: Vector2[];
}

export class ServerBattleScene {
  worldScene: ServerWorldScene;
  io: Server;
  sockets: Socket[] = [];
  id: string;
  allies: ServerUnit[] = [];
  enemies: ServerUnit[] = [];
  units: ServerUnit[] = [];
  timeline: ServerUnit[] = [];
  battleIsFinished: boolean = false;

  currentPlayer: ServerUnit;
  map: any;
  background: any;
  obstacles: any;
  playerStarterTiles: Position[] = [];
  enemyStarterTiles: Position[] = [];
  mapName: string;

  isInPreparationMode: boolean;
  turnIndex: number = 0;

  worldUnits: ServerWorldUnit[] = [];

  constructor(
    worldScene: ServerWorldScene,
    io: Server,
    socket: Socket,
    worldUnit: ServerWorldUnit,
    enemy: ServerWorldUnit,
    id: string
  ) {
    this.worldScene = worldScene;
    this.io = io;
    this.worldUnits.push(worldUnit);
    this.sockets.push(socket);
    this.id = id;

    this.createTilemapAndStartUpBattle(worldUnit, enemy);
  }

  tellPlayerBattleHasStarted(socket: Socket) {
    socket.emit(
      "battleHasStarted",
      this.allies,
      this.enemies,
      this.timeline,
      this.mapName
    );

    this.isInPreparationMode = true;
    this.listenToPreparationModeEvents(socket);
  }
  //
  listenToPreparationModeEvents(socket: Socket) {
    socket.on(
      "playerChangedStartPosition",
      (playerId: string, position: Position) => {
        if (this.isInPreparationMode) {
          const myUnit = this.findUnitById(playerId);
          if (!myUnit.isReady) {
            // check if new start position is authorized
            if (
              !this.obstacles.tileAt(position.indX, position.indY) &&
              !this.isUnitThere(position.indX, position.indY) &&
              ((myUnit.isAlly && myUnit.indX <= this.map.width / 3) ||
                (!myUnit.isAlly && myUnit.indX >= (this.map.width * 2) / 3))
            ) {
              this.removeFromObstacleLayer(myUnit.indX, myUnit.indY);
              myUnit.indX = position.indX;
              myUnit.indY = position.indY;
              this.addToObstacleLayer(position.indX, position.indY);
              // send info to all participants in battle that someone changed starter position
              this.io
                .to(this.id)
                .emit("playerHasChangedStartPosition", playerId, position);
            }
          }
        }
      }
    );

    // on clicking start battle button
    socket.on("playerIsReady", (playerId: string) => {
      if (this.isInPreparationMode) {
        const myPlayer = this.findUnitById(playerId);
        if (myPlayer) {
          myPlayer.isReady = true;
          socket.emit("readyIsConfirmed");
        }
        if (this.everyoneIsReady()) {
          this.startBattleMainPhase(socket);
        }
      }
    });

    this.addMainBattlePhaseListeners(socket);
  }

  addMainBattlePhaseListeners(socket: Socket) {
    socket.on("playerClickedEndTurn", () => {
      if (!this.isInPreparationMode && !this.battleIsFinished) {
        const myUnit = this.findUnitById(socket.id);
        if (myUnit && myUnit.isUnitTurn) {
          myUnit.endTurn();
          this.io.to(this.id).emit("endPlayerTurn", myUnit);
          this.nextTurn();
        }
      }
    });

    socket.on("playerMove", (movementData: Vector2) => {
      if (!this.isInPreparationMode && !this.battleIsFinished) {
        const myUnit = this.findUnitById(socket.id);

        if (myUnit && myUnit.isUnitTurn) {
          const startVec: Vector2 = {
            x: myUnit.indX,
            y: myUnit.indY,
          };
          const targetVec = movementData;

          const path = findPath(
            startVec,
            targetVec,
            this.background,
            this.obstacles
          );
          // check if movement is actually possible
          if (path && path.length > 0 && path.length <= myUnit.pm) {
            this.removeFromObstacleLayer(myUnit.indX, myUnit.indY);
            myUnit.indX = movementData.x;
            myUnit.indY = movementData.y;
            this.addToObstacleLayer(movementData.x, movementData.y);
            myUnit.pm -= path.length;
            // emit a message to all players about the unit that moved
            this.io.to(this.id).emit("unitMoved", myUnit, path);
          }
        }
      }
    });

    socket.on("playerCastSpell", (spell: Spell, targetVec: Vector2) => {
      if (!this.isInPreparationMode && !this.battleIsFinished) {
        const myUnit = this.findUnitById(socket.id);

        if (myUnit && myUnit.isUnitTurn) {
          myUnit.castSpell(this, spell, targetVec);
        }
      }
    });
  }

  private startBattleMainPhase(socket: Socket) {
    this.isInPreparationMode = false;
    // tell all battle participants that the battle begins
    this.io.to(this.id).emit("startMainBattlePhase");

    // then start first player turn
    this.nextTurn();

    // tell world map you can't join battle anymore
    this.io.to("world").emit("removeBattleIcon", this.id);
    this.worldScene.removeBattleIcon(this.id);
  }

  nextTurn() {
    if (this.turnIndex >= this.timeline.length) {
      this.turnIndex = 0;
    }

    const currentUnit = this.timeline[this.turnIndex];

    const effectOverTime = { ...currentUnit.effectOverTime };
    currentUnit.undergoEffectOverTime();
    this.checkDead(currentUnit);
    this.io
      .to(this.id)
      .emit("unitTurnBegins", currentUnit, effectOverTime, this.turnIndex);
    if (!this.battleIsFinished) {
      if (!currentUnit.isDead()) {
        if (currentUnit.isPlayable) {
          // this boolean tells the server whether to accept incoming events from this playable unit
          currentUnit.isUnitTurn = true;
        } else {
          currentUnit.playTurn(this);
        }
        this.turnIndex++;
      } else {
        this.nextTurn();
      }
    }
  }

  isPosAccessibleToSpell(playerPos: Vector2, targetVec: Vector2, spell: Spell) {
    const distance =
      Math.abs(playerPos.x - targetVec.x) + Math.abs(playerPos.y - targetVec.y);
    if (
      distance >= spell.minRange &&
      distance <= spell.maxRange &&
      (!this.obstacles.tileAt(targetVec.x, targetVec.y) ||
        this.isUnitThere(targetVec.x, targetVec.y))
    ) {
      // if spell doesn't need line of sight we just need to ensure tile isn't an obstacle
      if (!spell.lineOfSight) return true;
      // else we use the line of sight algorithm
      else {
        // case of spells being cast in straight line only
        let isInStraightLine = true;
        if (spell.straightLine) {
          isInStraightLine =
            playerPos.x === targetVec.x || playerPos.y === targetVec.y;
        }
        return (
          isInStraightLine &&
          isVisible(playerPos, targetVec, this.obstacles, this)
        );
      }
    }
    return false;
  }

  // move function for push/pull spells
  moveUnitBy(
    unit: ServerUnit,
    value: number,
    isAlignedX: boolean,
    isForward: number
  ) {
    this.removeFromObstacleLayer(unit.indX, unit.indY);
    if (isAlignedX) {
      let deltaX = value * isForward;
      let direction = Math.sign(deltaX);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaX); i += direction) {
        let nextTileX = unit.indX + i + direction;
        if (
          this.obstacles.tileAt(nextTileX, unit.indY) ||
          !this.background.tileAt(nextTileX, unit.indY) ||
          nextTileX >= this.map.width ||
          nextTileX < 0
        ) {
          deltaX = i;
          break;
        }
      }
      unit.indX += deltaX;
    } else {
      let deltaY = value * isForward;
      let direction = Math.sign(deltaY);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaY); i += direction) {
        let nextTileY = unit.indY + i + direction;
        if (
          this.obstacles.tileAt(unit.indX, nextTileY) ||
          !this.background.tileAt(unit.indX, nextTileY) ||
          nextTileY < 0
        ) {
          deltaY = i;
          break;
        }
      }
      unit.indY += deltaY;
    }
    this.addToObstacleLayer(unit.indX, unit.indY);
  }

  checkDead(unit: ServerUnit) {
    if (unit.isDead()) {
      this.removeUnitFromBattle(unit.id);
      if (unit.isUnitTurn) {
        this.io.to(this.id).emit("endPlayerTurn", unit);
        this.turnIndex--;
        this.nextTurn();
      }
    }
  }

  addSummonedUnit(caster: ServerUnit, spell: Spell, targetVec: Vector2) {
    const summonedUnit = new ServerUnit(
      true,
      caster.id + "_" + caster.summonedUnits.length,
      false,
      caster.isAlly,
      targetVec.x,
      targetVec.y,
      spell.summons.name,
      0xffffff
    );
    this.addToObstacleLayer(summonedUnit.indX, summonedUnit.indY);
    this.units.push(summonedUnit);
    caster.isAlly
      ? this.allies.push(summonedUnit)
      : this.enemies.push(summonedUnit);
    this.addSummonedUnitToTimeline(caster, summonedUnit);
    caster.summonedUnits.push(summonedUnit);
    return summonedUnit;
  }

  // add summoned unit after the summoner in the timeline
  addSummonedUnitToTimeline(caster: ServerUnit, summonedUnit: ServerUnit) {
    const index = this.timeline.findIndex(
      (timelineUnit) => timelineUnit === caster
    );
    if (index !== -1) {
      this.timeline.splice(index + 1, 0, summonedUnit);
    }
  }

  getUnitsInsideAoe(
    caster: ServerUnit,
    indX: number,
    indY: number,
    spell: Spell
  ) {
    const unitsInAoe: ServerUnit[] = [];
    switch (spell.aoe) {
      case "monoTarget":
        if (this.isUnitThere(indX, indY)) {
          unitsInAoe.push(this.getUnitAtPos(indX, indY));
        }
        break;
      case "star":
        for (let i = indX - spell.aoeSize; i <= indX + spell.aoeSize; i++) {
          for (let j = indY - spell.aoeSize; j <= indY + spell.aoeSize; j++) {
            let distance = Math.abs(indX - i) + Math.abs(indY - j);
            if (distance <= spell.aoeSize) {
              if (this.isUnitThere(i, j)) {
                unitsInAoe.push(this.getUnitAtPos(i, j));
              }
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        let target = { x: indX, y: indY };
        // true if target is aligned horizontally with caster (else we assume it's aligned vertically)
        let isAlignedX = target.y == caster.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - caster.indX)
          : Math.sign(target.y - caster.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          let pos = isAlignedX
            ? {
                x: baseIndex + i * isForward,
                y: target.y,
              }
            : {
                x: target.x,
                y: baseIndex + i * isForward,
              };
          if (this.isUnitThere(pos.x, pos.y)) {
            unitsInAoe.push(this.getUnitAtPos(pos.x, pos.y));
          }
        }
        break;

      default:
        break;
    }
    return unitsInAoe;
  }

  getUnitAtPos(indX: number, indY: number) {
    return this.units.find((unit) => unit.indX === indX && unit.indY === indY);
  }

  everyoneIsReady() {
    return this.units.every((unit) => unit.isReady);
  }

  addUnitsOnStart(newPlayer: ServerWorldUnit, enemy: ServerWorldUnit) {
    this.addUnitOnStart(newPlayer, newPlayer.id, true, true);
    // add 2 enemies of the kind
    this.addUnitOnStart(enemy, enemy.id, false, false);
    this.addUnitOnStart(enemy, uuidv4(), false, false);
    this.createTimeline();
  }

  addUnitOnStart(
    unit: ServerWorldUnit,
    id: string,
    isAlly: boolean,
    isPlayable: boolean
  ) {
    const playerData = unitsAvailable.find(
      (unitData) => unitData.name === unit.type
    );
    if (playerData) {
      let starterTiles: Position[];
      starterTiles = isAlly ? this.playerStarterTiles : this.enemyStarterTiles;
      let indX: number, indY: number;
      do {
        const randTile = Math.floor(Math.random() * (starterTiles.length - 1));
        indX = starterTiles[randTile].indX;
        indY = starterTiles[randTile].indY;
      } while (this.isUnitThere(indX, indY));
      const myUnit = new ServerUnit(
        !isPlayable, // npcs are ready by default so the battle can start
        id,
        isPlayable,
        isAlly,
        indX,
        indY,
        unit.type,
        unit.tint
      );
      this.addToObstacleLayer(myUnit.indX, myUnit.indY);
      this.units.push(myUnit);
      isAlly ? this.allies.push(myUnit) : this.enemies.push(myUnit);
      return myUnit;
    } else {
      throw new Error("Error : unit not found");
    }
  }

  addPlayerAfterBattleStart(
    socket: Socket,
    player: ServerWorldUnit,
    isAlly: boolean
  ) {
    this.sockets.push(socket);
    const newPlayer = this.addUnitOnStart(player, player.id, isAlly, true);
    this.timeline.push(newPlayer);
    this.tellPlayerBattleHasStarted(socket);
    // update all other players of the new player
    socket.broadcast
      .to(this.id)
      .emit("playerJoinedBattle", newPlayer, this.timeline);
  }

  private createTilemapAndStartUpBattle(player: any, enemy: any) {
    let tmx = require("tmx-parser");

    // choose map randomly among a set
    const mapCount = 3;
    const randomMapIndex = Math.floor(Math.random() * mapCount) + 1;
    this.mapName = `battlemap${randomMapIndex}`;

    tmx.parseFile(`./public/assets/map/${this.mapName}.tmx`, (err, map) => {
      if (err) throw err;
      this.map = map;
      this.background = map.layers[0];
      this.obstacles = map.layers[1];

      this.calculateStarterTiles();
      this.addUnitsOnStart(player, enemy);
      this.tellPlayerBattleHasStarted(this.sockets[0]);
    });
  }

  private calculateStarterTiles() {
    for (let i = 0; i < this.background.tiles.length; i++) {
      let tileX = i % this.map.width;
      let tileY = Math.floor(i / this.map.width);
      if (this.obstacles.tileAt(tileX, tileY) === undefined) {
        // player starter tiles on left
        if (tileX <= this.map.width / 3) {
          this.playerStarterTiles.push({ indX: tileX, indY: tileY });
          // enemy starter tiles on right
        } else if (tileX >= (this.map.width * 2) / 3) {
          this.enemyStarterTiles.push({ indX: tileX, indY: tileY });
        }
      }
    }
  }

  private findUnitById(id: string) {
    return this.units.find((unit) => unit.id === id);
  }

  // return true if there is a unit at the specified position
  isUnitThere(x: number, y: number): boolean {
    return this.units.some((unit) => unit.indX == x && unit.indY == y);
  }

  // play order : alternate between allies and enemies
  createTimeline() {
    const maxSize = Math.max(this.allies.length, this.enemies.length);
    for (let i = 0; i < maxSize; i++) {
      if (this.allies.length > i) {
        this.timeline.push(this.allies[i]);
      }
      if (this.enemies.length > i) {
        this.timeline.push(this.enemies[i]);
      }
    }
  }

  removeUnitFromBattle(id: any) {
    let index = this.units.findIndex((player) => player.id === id);
    if (index !== -1) {
      const myUnit = this.units[index];
      myUnit.summonedUnits.forEach((summonedUnit) => {
        this.removeUnitFromBattle(summonedUnit.id);
      });
      this.removeFromObstacleLayer(myUnit.indX, myUnit.indY);
      this.units.splice(index, 1);
      this.io.to(this.id).emit("playerLeft", id);
    }

    index = this.allies.findIndex((player) => player.id === id);
    if (index !== -1) {
      this.allies.splice(index, 1);
      if (this.allies.length === 0) {
        this.battleIsFinished = true;
        setTimeout(() => {
          this.loseBattle();
        }, 100);
      }
    }

    index = this.enemies.findIndex((player) => player.id === id);
    if (index !== -1) {
      this.enemies.splice(index, 1);
      if (this.enemies.length === 0 && this.allies.length > 0) {
        this.battleIsFinished = true;
        setTimeout(() => {
          this.winBattle();
        }, 100);
      }
    }

    index = this.timeline.findIndex((player) => player.id === id);
    if (index !== -1) {
      this.timeline.splice(index, 1);
    }
  }

  private loseBattle() {
    this.io.to(this.id).emit("battleIsLost");
    this.endBattle();
  }

  private winBattle() {
    this.io.to(this.id).emit("battleIsWon");
    this.endBattle();
    this.sockets.forEach((socket) => {
      this.worldScene.movePlayerBackToWorld(socket);
    });
  }

  private endBattle() {
    this.makeSocketsLeaveBattleRoom();
    this.worldScene.removeBattle(this.id);
    this.worldScene.removeBattleIcon(this.id);
    this.io.to("world").emit("removeBattleIcon", this.id);
  }

  private makeSocketsLeaveBattleRoom() {
    this.sockets.forEach((socket) => {
      socket.leave(this.id);
    });
  }

  addToObstacleLayer(indX: number, indY: number) {
    let targetTile = this.background.tileAt(indX, indY);
    this.obstacles.setTileAt(indX, indY, targetTile);
  }

  removeFromObstacleLayer(indX: number, indY: number) {
    this.obstacles.setTileAt(indX, indY, undefined);
  }

  calculateAccessibleTiles(pos: Vector2, pm: number) {
    const { x, y } = pos;
    let tablePos: ServerTilePath[] = [];

    for (let i = 0; i < this.background.tiles.length; i++) {
      let tileX = i % this.map.width;
      let tileY = Math.floor(i / this.map.width);
      const isPlayerTile = tileX == x && tileY == y;
      const distance = Math.abs(tileX - x) + Math.abs(tileY - y);
      let path;
      if (
        !isPlayerTile &&
        distance <= pm &&
        this.obstacles.tileAt(tileX, tileY) === undefined
      ) {
        const target = { x: tileX, y: tileY };
        path = findPath(pos, target, this.background, this.obstacles);
        if (path && path.length > 0 && path.length <= pm) {
          let myPos: ServerTilePath = {
            path: path,
            pos: { x: tileX, y: tileY },
          };
          tablePos.push(myPos);
        }
      }
    }
    return tablePos;
  }
}
