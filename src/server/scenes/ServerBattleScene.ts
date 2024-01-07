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
  id: string;
  worldPlayers: ServerWorldUnit[] = [];
  teamA: ServerUnit[] = [];
  teamB: ServerUnit[] = [];
  units: ServerUnit[] = [];
  timeline: ServerUnit[] = [];
  battleIsFinished: boolean = false;

  currentPlayer: ServerUnit;
  map: any;
  background: any;
  obstacles: any;
  teamAStarterTiles: Position[] = [];
  teamBStarterTiles: Position[] = [];
  mapName: string;

  isInPreparationMode: boolean;
  timelineIndex: number = 0;

  constructor(
    worldScene: ServerWorldScene,
    io: Server,
    unitA: ServerWorldUnit,
    unitB: ServerWorldUnit,
    id: string
  ) {
    this.worldScene = worldScene;
    this.io = io;
    if (unitA.isPlayable) this.worldPlayers.push(unitA);
    if (unitB.isPlayable) this.worldPlayers.push(unitB);
    this.id = id;

    this.createTilemapAndStartUpBattle(unitA, unitB);
  }

  tellPlayerBattleHasStarted(socket: Socket) {
    socket.emit(
      "battleHasStarted",
      this.teamA,
      this.teamB,
      this.timeline,
      this.mapName
    );

    this.isInPreparationMode = true;
    this.listenToPreparationModeEvents(socket);
  }

  listenToPreparationModeEvents(socket: Socket) {
    socket.on(
      "playerChangedStartPosition",
      (playerId: string, position: Position) => {
        if (this.isInPreparationMode) {
          const myUnit = this.findUnitById(playerId);
          if (!myUnit.isReady) {
            // check if new start position is authorized
            const isPositionInTeamAStarterTiles = this.teamAStarterTiles.some(
              (starterPosition) =>
                starterPosition.indX === position.indX &&
                starterPosition.indY === position.indY
            );
            const isPositionInTeamBStarterTiles = this.teamBStarterTiles.some(
              (starterPosition) =>
                starterPosition.indX === position.indX &&
                starterPosition.indY === position.indY
            );
            if (
              !this.obstacles.tileAt(position.indX, position.indY) &&
              !this.isUnitThere(position.indX, position.indY) &&
              ((myUnit.isTeamA && isPositionInTeamAStarterTiles) ||
                (!myUnit.isTeamA && isPositionInTeamBStarterTiles))
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
    socket.on("playerClickedReadyButton", (playerId: string) => {
      if (this.isInPreparationMode) {
        const myPlayer = this.findUnitById(playerId);
        if (myPlayer) {
          if (!myPlayer.isReady) {
            myPlayer.isReady = true;
            socket.emit("readyIsConfirmed");
            this.io.to(this.id).emit("playerIsReady", myPlayer);
          } else {
            myPlayer.isReady = false;
            socket.emit("notReadyIsConfirmed");
            this.io.to(this.id).emit("playerIsNotReady", myPlayer);
          }
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
    this.io.to("world").emit("removeBattleIcons", this.id);
    this.worldScene.removeBattleIcons(this.id);
  }

  nextTurn() {
    if (this.timelineIndex >= this.timeline.length) {
      this.timelineIndex = 0;
    }

    const currentUnit = this.timeline[this.timelineIndex];

    const effectOverTime = { ...currentUnit.effectOverTime };
    currentUnit.undergoEffectOverTime();
    this.checkDead(currentUnit);
    this.io
      .to(this.id)
      .emit("unitTurnBegins", currentUnit, effectOverTime, this.timelineIndex);

    if (!this.battleIsFinished) {
      if (!currentUnit.isDead()) {
        if (currentUnit.isPlayable) {
          // this boolean tells the server whether to accept incoming events from this playable unit
          currentUnit.isUnitTurn = true;
        } else {
          currentUnit.playTurn(this);
        }
        this.timelineIndex++;
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
      if (!this.battleIsFinished && unit.isUnitTurn) {
        this.io.to(this.id).emit("endPlayerTurn", unit);
        this.timelineIndex--;
        this.nextTurn();
      }
    }
  }

  addSummonedUnit(caster: ServerUnit, spell: Spell, targetVec: Vector2) {
    const summonedUnit = new ServerUnit(
      true,
      caster.id + "_" + caster.summonedUnits.length,
      false,
      caster.isTeamA,
      targetVec.x,
      targetVec.y,
      spell.summons.name,
      0xffffff
    );
    this.addToObstacleLayer(summonedUnit.indX, summonedUnit.indY);
    this.units.push(summonedUnit);
    caster.isTeamA
      ? this.teamA.push(summonedUnit)
      : this.teamB.push(summonedUnit);
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
    return this.timeline.find(
      (unit) => unit.indX === indX && unit.indY === indY
    );
  }

  everyoneIsReady() {
    return this.timeline.every((unit) => unit.isReady);
  }

  addUnitsOnStart(unitA: ServerWorldUnit, unitB: ServerWorldUnit) {
    this.initTeam(unitA, true);
    this.initTeam(unitB, false);
    this.createTimeline();
  }

  private initTeam(unitA: ServerWorldUnit, isTeamA: boolean) {
    // if unit is playable, add it to the battle and make it a player
    if (unitA.isPlayable) {
      this.addUnitOnStart(unitA, unitA.id, isTeamA, true);
    } else {
      // else add 2 npcs of the kind
      this.addUnitOnStart(unitA, unitA.id, isTeamA, false);
      this.addUnitOnStart(unitA, uuidv4(), isTeamA, false);
    }
  }

  addUnitOnStart(
    unit: ServerWorldUnit,
    id: string,
    isTeamA: boolean,
    isPlayable: boolean
  ) {
    const playerData = unitsAvailable.find(
      (unitData) => unitData.name === unit.type
    );
    if (playerData) {
      let starterTiles: Position[];
      starterTiles = isTeamA ? this.teamAStarterTiles : this.teamBStarterTiles;
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
        isTeamA,
        indX,
        indY,
        unit.type,
        unit.tint
      );
      this.addToObstacleLayer(myUnit.indX, myUnit.indY);
      this.units.push(myUnit);
      isTeamA ? this.teamA.push(myUnit) : this.teamB.push(myUnit);
      return myUnit;
    } else {
      throw new Error("Error : unit not found");
    }
  }

  addPlayerAfterBattleStart(player: ServerWorldUnit, isTeamA: boolean) {
    this.worldPlayers.push(player);
    const newPlayer = this.addUnitOnStart(player, player.id, isTeamA, true);
    this.timeline.push(newPlayer);
    const playerSocket = this.worldScene.findSocketById(player.id);
    this.tellPlayerBattleHasStarted(playerSocket);
    // update all other players of the new player
    playerSocket.broadcast
      .to(this.id)
      .emit("playerJoinedBattle", newPlayer, this.timeline);
  }

  private createTilemapAndStartUpBattle(
    unitA: ServerWorldUnit,
    unitB: ServerWorldUnit
  ) {
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
      this.addUnitsOnStart(unitA, unitB);

      if (unitA.isPlayable) {
        const unitASocket = this.worldScene.findSocketById(unitA.id);
        if (unitASocket) this.tellPlayerBattleHasStarted(unitASocket);
      }
      if (unitB.isPlayable) {
        const unitBSocket = this.worldScene.findSocketById(unitB.id);
        if (unitBSocket) this.tellPlayerBattleHasStarted(unitBSocket);
      }
    });
  }

  private calculateStarterTiles() {
    for (let i = 0; i < this.background.tiles.length; i++) {
      let tileX = i % this.map.width;
      let tileY = Math.floor(i / this.map.width);
      if (this.obstacles.tileAt(tileX, tileY) === undefined) {
        // player starter tiles on left
        if (tileX <= this.map.width / 3) {
          this.teamAStarterTiles.push({ indX: tileX, indY: tileY });
          // enemy starter tiles on right
        } else if (tileX >= Math.floor((this.map.width * 2) / 3)) {
          this.teamBStarterTiles.push({ indX: tileX, indY: tileY });
        }
      }
    }
  }

  private findUnitById(id: string) {
    return this.units.find((unit) => unit.id === id);
  }

  // return true if there is a unit at the specified position
  isUnitThere(x: number, y: number): boolean {
    return this.timeline.some((unit) => unit.indX == x && unit.indY == y);
  }

  // play order : alternate between allies and enemies
  createTimeline() {
    const maxSize = Math.max(this.teamA.length, this.teamB.length);
    for (let i = 0; i < maxSize; i++) {
      if (this.teamA.length > i) {
        this.timeline.push(this.teamA[i]);
      }
      if (this.teamB.length > i) {
        this.timeline.push(this.teamB[i]);
      }
    }
  }

  removeUnitFromBattle(id: string) {
    let index = this.timeline.findIndex((player) => player.id === id);
    if (index !== -1) {
      const myUnit = this.timeline[index];
      myUnit.summonedUnits.forEach((summonedUnit) => {
        this.removeUnitFromBattle(summonedUnit.id);
      });
      this.removeFromObstacleLayer(myUnit.indX, myUnit.indY);
      this.timeline.splice(index, 1);
      if (this.timelineIndex > index) this.timelineIndex--;

      this.io.to(this.id).emit("playerLeft", id, this.timeline);
    }

    this.checkIfBattleIsOver();
  }

  // check if either team has no living unit left
  private checkIfBattleIsOver() {
    if (!this.timeline.some((unit) => unit.isTeamA)) {
      this.loseBattle(this.teamA);
      this.winBattle(this.teamB);
      this.endBattle();
    } else if (!this.timeline.some((unit) => !unit.isTeamA)) {
      this.loseBattle(this.teamB);
      this.winBattle(this.teamA);
      this.endBattle();
    }
  }

  // use this when player disconnects during battle
  removeCompletelyUnitFromBattle(id: string) {
    this.removeUnitFromArray(this.teamA, id);
    this.removeUnitFromArray(this.teamB, id);
    this.removeUnitFromArray(this.units, id);

    this.removeUnitFromBattle(id);
  }

  private removeUnitFromArray(array: ServerUnit[], id: string) {
    let index = array.findIndex((player) => player.id === id);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  private loseBattle(team: ServerUnit[]) {
    team.forEach((unit) => {
      this.io.to(unit.id).emit("battleIsLost");
    });
  }

  private winBattle(team: ServerUnit[]) {
    team.forEach((unit) => {
      this.io.to(unit.id).emit("battleIsWon");
      const playerSocket = this.worldScene.findSocketById(unit.id);
      if (playerSocket) this.worldScene.movePlayerBackToWorld(playerSocket);
    });
  }

  private endBattle() {
    this.battleIsFinished = true;
    // if battle against npc is lost, make it reappear on world map
    if (
      this.timeline.length > 0 &&
      !this.timeline.some((unit) => unit.isPlayable)
    ) {
      this.worldScene.makeNpcVisibleAgain(this.teamB[0].id);
    }
    this.makeSocketsLeaveBattleRoom();
    this.worldScene.removeBattle(this.id);
    this.worldScene.removeBattleIcons(this.id);
  }

  private makeSocketsLeaveBattleRoom() {
    this.worldPlayers.forEach((worldPlayer) => {
      const playerSocket = this.worldScene.findSocketById(worldPlayer.id);
      playerSocket.leave(this.id);
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
