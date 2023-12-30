import { Server, Socket } from "socket.io";
import { ServerWorldUnit, Position } from "./ServerWorldScene";
import { unitsAvailable } from "../../client/data/UnitData";
import { ServerUnit } from "./ServerUnit";
import findPath, { Vector2 } from "../utils/findPath";
import { Spell } from "../../client/classes/battle/Spell";
import isVisible from "../utils/lineOfSight";

export class ServerBattleScene {
  io: Server;
  socket: Socket; // ! that's the socket of the creator of the battle
  id: string;
  allies: ServerUnit[] = [];
  enemies: ServerUnit[] = [];
  units: ServerUnit[] = [];
  timeline: ServerUnit[] = [];

  currentPlayer: ServerUnit;
  map: any;
  background: any;
  obstacles: any;
  playerStarterTiles: Position[] = [];
  enemyStarterTiles: Position[] = [];
  mapName: string;

  isInPreparationMode: boolean;

  constructor(
    io: Server,
    socket: Socket,
    player: ServerWorldUnit,
    enemy: ServerWorldUnit,
    id: string
  ) {
    this.io = io;
    this.socket = socket;
    this.id = id;

    this.createTilemapAndStartUpBattle(player, enemy);
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
              this.removeFromObstacleLayer(myUnit);
              myUnit.indX = position.indX;
              myUnit.indY = position.indY;
              this.addToObstacleLayer({ x: position.indX, y: position.indY });
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
      const myPlayer = this.findUnitById(playerId);
      if (myPlayer) {
        myPlayer.isReady = true;
        socket.emit("readyIsConfirmed");
      }
      if (this.everyoneIsReady()) {
        this.startBattleMainPhase(socket);
      }
    });
  }

  private startBattleMainPhase(socket) {
    this.isInPreparationMode = false;
    // tell all battle participants that the battle begins
    this.io.to(this.id).emit("startMainBattlePhase");

    // then notify first player to begin turn (if it's not an npc)
    const currentPlayer = this.timeline[0];
    if (currentPlayer.isPlayable) {
      this.io.to(currentPlayer.id).emit("yourTurnBegins", currentPlayer.id);
    }

    // tell world map you can't join battle anymore
    this.io.to("world").emit("removeBattleIcon", this.enemies[0].id);

    socket.on("playerClickedEndTurn", (playerId) => {
      const myUnit = this.findUnitById(playerId);
      myUnit.endTurn();
      this.io.to(this.id).emit("endPlayerTurn", myUnit);
    });

    socket.on("playerMove", (movementData: Vector2) => {
      const currentPlayer = this.findUnitById(socket.id);

      if (currentPlayer) {
        const startVec: Vector2 = {
          x: currentPlayer.indX,
          y: currentPlayer.indY,
        };
        const targetVec = movementData;

        const path = findPath(
          startVec,
          targetVec,
          this.background,
          this.obstacles
        );
        // check if movement is actually possible
        if (path && path.length > 0 && path.length <= currentPlayer.pm) {
          this.removeFromObstacleLayer(currentPlayer);
          currentPlayer.indX = movementData.x;
          currentPlayer.indY = movementData.y;
          this.addToObstacleLayer(movementData);
          currentPlayer.pm -= path.length;
          // emit a message to all players about the unit that moved
          this.io.to(this.id).emit("unitMoved", currentPlayer);
        }
      }
    });

    socket.on("playerCastSpell", (spell: Spell, targetVec: Vector2) => {
      const currentPlayer = this.findUnitById(socket.id);

      if (currentPlayer) {
        const playerPos: Vector2 = {
          x: currentPlayer.indX,
          y: currentPlayer.indY,
        };

        const playerSpell = currentPlayer.spells.find(
          (mySpell) => mySpell.name === spell.name
        );

        if (
          currentPlayer.pa >= spell.cost &&
          playerSpell.cooldown === 0 &&
          playerSpell &&
          this.isPosAccessibleToSpell(playerPos, targetVec, spell)
        ) {
          currentPlayer.pa -= spell.cost;
          playerSpell.cooldown = spell.maxCooldown;

          const affectedUnits = this.getUnitsInsideAoe(
            currentPlayer,
            targetVec.x,
            targetVec.y,
            spell
          );

          affectedUnits.forEach((unit) => {
            unit.undergoSpell(spell);
            if (spell.moveTargetBy) {
              // check alignment for spells that push or pull
              const isAlignedX = targetVec.y == currentPlayer.indY;
              const isForward = isAlignedX
                ? Math.sign(targetVec.x - currentPlayer.indX)
                : Math.sign(targetVec.y - currentPlayer.indY);
              this.moveUnitBy(unit, spell.moveTargetBy, isAlignedX, isForward);
            }
            this.checkDead(unit);
          });

          // if spell summons a unit AND targeted tile is free, summon the unit
          let summonedUnit = null;
          if (
            spell.summons &&
            !this.obstacles.tileAt(targetVec.x, targetVec.y)
          ) {
            summonedUnit = this.addSummonedUnit(
              currentPlayer,
              spell,
              targetVec
            );
          }

          this.io
            .to(this.id)
            .emit(
              "unitHasCastSpell",
              currentPlayer,
              this.timeline,
              playerSpell,
              targetVec,
              affectedUnits,
              summonedUnit
            );
        }
      }
    });
  }

  private isPosAccessibleToSpell(
    playerPos: Vector2,
    targetVec: Vector2,
    spell: Spell
  ) {
    const distance =
      Math.abs(playerPos.x - targetVec.x) + Math.abs(playerPos.y - targetVec.y);
    return (
      distance >= spell.minRange &&
      distance <= spell.maxRange &&
      (!spell.lineOfSight ||
        isVisible(playerPos, targetVec, this.obstacles, this))
    );
  }

  // move function for push/pull spells
  moveUnitBy(
    unit: ServerUnit,
    value: number,
    isAlignedX: boolean,
    isForward: number
  ) {
    this.removeFromObstacleLayer(unit);
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
    this.addToObstacleLayer({ x: unit.indX, y: unit.indY });
  }

  checkDead(unit: ServerUnit) {
    if (unit.hp <= 0) {
      this.removeUnitFromBattle(unit.id);
    }
  }

  private addSummonedUnit(
    caster: ServerUnit,
    spell: Spell,
    targetVec: Vector2
  ) {
    const summonedUnit = new ServerUnit(
      this,
      true,
      caster.id + "_" + caster.summonedUnits.length,
      true,
      caster.isAlly,
      targetVec.x,
      targetVec.y,
      spell.summons.name
    );
    this.addToObstacleLayer({ x: summonedUnit.indX, y: summonedUnit.indY });
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
    this.addUnitOnStart(newPlayer, true, true);
    this.addUnitOnStart(enemy, false, false);
    this.createTimeline();
  }

  addUnitOnStart(unit: ServerWorldUnit, isAlly: boolean, isPlayable: boolean) {
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
        this,
        !isPlayable, // npcs are ready by default so the battle can start
        unit.id,
        isPlayable,
        isAlly,
        indX,
        indY,
        unit.type
      );
      this.addToObstacleLayer({ x: myUnit.indX, y: myUnit.indY });
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
    const newPlayer = this.addUnitOnStart(player, isAlly, true);
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
      this.tellPlayerBattleHasStarted(this.socket);
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
      this.removeFromObstacleLayer(this.units[index]);
      this.units.splice(index, 1);
      this.io.to(this.id).emit("playerDisconnect", id);
    }

    index = this.allies.findIndex((player) => player.id === id);
    if (index !== -1) {
      this.allies.splice(index, 1);
    }

    index = this.enemies.findIndex((player) => player.id === id);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    index = this.timeline.findIndex((player) => player.id === id);
    if (index !== -1) {
      this.timeline.splice(index, 1);
    }
  }

  addToObstacleLayer(target: Vector2) {
    let targetTile = this.background.tileAt(target.x, target.y);
    this.obstacles.setTileAt(target.x, target.y, targetTile);
  }

  removeFromObstacleLayer(unit: ServerUnit) {
    this.obstacles.setTileAt(unit.indX, unit.indY, null);
  }
}
