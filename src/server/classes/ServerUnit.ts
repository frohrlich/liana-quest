import { EffectOverTime } from "../../client/classes/battle/EffectOverTime";
import { Spell } from "../../client/classes/battle/Spell";
import { javelin, punch, sting, heal } from "../../client/data/SpellData";
import { unitsAvailable } from "../../client/data/UnitData";
import { Vector2 } from "../utils/findPath";
import isVisible from "../utils/lineOfSight";
import { ServerBattleScene } from "../scenes/ServerBattleScene";

export class ServerUnit {
  isReady: boolean;
  id: string;
  isPlayable: boolean;
  isTeamA: boolean;
  indX: number;
  indY: number;
  type: string;
  tint: number;
  maxPm: number;
  maxPa: number;
  maxHp: number;
  pm: number;
  pa: number;
  hp: number;
  spells: Spell[] = [];
  effectOverTime: EffectOverTime;
  summonedUnits: ServerUnit[] = [];
  isUnitTurn: boolean = false;

  constructor(
    isReady: boolean,
    id: string,
    isPlayable: boolean,
    isTeamA: boolean,
    indX: number,
    indY: number,
    type: string,
    tint: number
  ) {
    this.isReady = isReady;
    this.id = id;
    this.tint = tint;
    this.isPlayable = isPlayable;
    this.isTeamA = isTeamA;
    this.indX = indX;
    this.indY = indY;
    this.type = type;

    // retrieve unit characteristics
    const playerData = unitsAvailable.find(
      (unitData) => unitData.name === type
    );
    this.maxHp = playerData.HP;
    this.hp = this.maxHp;
    this.maxPa = playerData.PA;
    this.pa = this.maxPa;
    this.maxPm = playerData.PM;
    this.pm = this.maxPm;

    this.addSpells.apply(this, this.decodeSpellString(playerData.spells));
  }

  refillPoints() {
    this.pm = this.maxPm;
    this.pa = this.maxPa;
  }

  // add spells to a unit
  addSpells(...spells: Spell[]) {
    const copySpells = [];
    // each unit must have its own copy of each spell to manage cooldowns separately
    spells.forEach((spell) => {
      copySpells.push({ ...spell });
    });
    this.spells = this.spells.concat(copySpells);
  }

  // transform a list of spell names in a string into an array of Spell objects
  decodeSpellString(spellStr: string) {
    let spellArray: Spell[] = [];
    spellStr.split(", ").forEach((spellName) => {
      switch (spellName) {
        case "deadly javelin":
          spellArray.push(javelin);
          break;
        case "punch":
          spellArray.push(punch);
          break;
        case "sting":
          spellArray.push(sting);
          break;
        case "herbal medicine":
          spellArray.push(heal);
          break;
        default:
          break;
      }
    });
    return spellArray;
  }

  private decrementSpellCooldowns() {
    this.spells.forEach((spell) => {
      spell.cooldown--;
    });
  }

  endTurn() {
    this.refillPoints();
    this.decrementSpellCooldowns();
    this.isUnitTurn = false;
  }

  undergoSpell(spell: Spell) {
    this.hp -= spell.damage;
    this.hp = Math.min(this.hp + spell.heal, this.maxHp);
    this.pm -= spell.malusPM;
    this.pm += spell.bonusPM;
    this.pa -= spell.malusPA;
    this.pa += spell.bonusPA;

    this.hp = Math.max(this.hp, 0);
    this.pm = Math.max(this.pm, 0);
    this.pa = Math.max(this.pa, 0);

    if (spell.effectOverTime) {
      this.addEffectOverTime(spell.effectOverTime);
    }
  }

  addEffectOverTime(effectOverTime: EffectOverTime) {
    this.effectOverTime = { ...effectOverTime };
  }

  undergoEffectOverTime() {
    const eot = this.effectOverTime;
    if (eot && eot.duration > 0) {
      this.hp -= eot.damage;
      // no healing over max hp
      this.hp = Math.min(this.hp + eot.heal, this.maxHp);
      this.pa -= eot.malusPA;
      this.pa += eot.bonusPA;
      this.pm -= eot.malusPM;
      this.pm += eot.bonusPM;
      eot.duration--;
      if (eot.duration <= 0) {
        this.effectOverTime = null;
      }
    }
  }

  castSpell(battleScene: ServerBattleScene, spell: Spell, targetVec: Vector2) {
    const playerPos: Vector2 = {
      x: this.indX,
      y: this.indY,
    };

    const playerSpell = this.spells.find(
      (mySpell) => mySpell.name === spell.name
    );

    if (
      this.pa >= spell.cost &&
      playerSpell.cooldown <= 0 &&
      playerSpell &&
      battleScene.isPosAccessibleToSpell(playerPos, targetVec, spell)
    ) {
      this.pa -= spell.cost;
      playerSpell.cooldown = spell.maxCooldown;

      const affectedUnits = battleScene.getUnitsInsideAoe(
        this,
        targetVec.x,
        targetVec.y,
        spell
      );

      affectedUnits.forEach((unit) => {
        unit.undergoSpell(spell);
        if (spell.moveTargetBy) {
          // check alignment for spells that push or pull
          const isAlignedX = targetVec.y == this.indY;
          const isForward = isAlignedX
            ? Math.sign(targetVec.x - this.indX)
            : Math.sign(targetVec.y - this.indY);
          battleScene.moveUnitBy(
            unit,
            spell.moveTargetBy,
            isAlignedX,
            isForward
          );
        }
        battleScene.checkDead(unit);
      });

      // if spell summons a unit AND targeted tile is free, summon the unit
      let summonedUnit = null;
      if (
        spell.summons &&
        !battleScene.obstacles.tileAt(targetVec.x, targetVec.y)
      ) {
        summonedUnit = battleScene.addSummonedUnit(this, spell, targetVec);
      }

      battleScene.io
        .to(battleScene.id)
        .emit(
          "unitHasCastSpell",
          this,
          battleScene.timeline,
          playerSpell,
          targetVec,
          affectedUnits,
          summonedUnit
        );
    }
  }

  playTurn(battleScene: ServerBattleScene) {
    if (!battleScene.battleIsFinished) {
      const delayAfterSpell = 400;
      const movementDuration = 300;
      if (this.tryToCastSpell(battleScene)) {
        setTimeout(() => {
          this.nextTurnAfterTryingToMove(battleScene, movementDuration);
        }, delayAfterSpell);
      } else {
        this.nextTurnAfterTryingToMove(battleScene, movementDuration);
      }
    }
  }

  private nextTurnAfterTryingToMove(
    battleScene: ServerBattleScene,
    movementDuration: number
  ) {
    const pathLength = this.tryToMove(battleScene);

    setTimeout(() => {
      this.endTurn();
      battleScene.io.to(battleScene.id).emit("endPlayerTurn", this);
      battleScene.nextTurn();
    }, pathLength * movementDuration);
  }

  // returns true on success
  tryToCastSpell(battleScene: ServerBattleScene) {
    const spell = this.spells[0];
    if (this.pa >= spell.cost && spell.cooldown <= 0) {
      let target: Vector2 = this.locateTarget(battleScene, spell);
      if (target) {
        this.castSpell(battleScene, spell, target);
        return true;
      }
    }
    return false;
  }

  // attempts to find an accessible tile around unit and move to it
  tryToMove(battleScene: ServerBattleScene) {
    if (this.pm > 0) {
      const startVec: Vector2 = { x: this.indX, y: this.indY };
      // first calculate the accessible tiles around npc
      let accessibleTiles = battleScene.calculateAccessibleTiles(
        startVec,
        this.pm
      );
      if (accessibleTiles.length === 0) return 0;
      // then chooses one randomly
      const randMove = Math.floor(Math.random() * (accessibleTiles.length - 1));
      const pos = accessibleTiles[randMove].pos;
      let path = accessibleTiles[randMove].path;

      if (path) {
        battleScene.removeFromObstacleLayer(this.indX, this.indY);
        this.indX = pos.x;
        this.indY = pos.y;
        battleScene.addToObstacleLayer(pos.x, pos.y);
        this.pm -= path.length;
        // emit a message to all players about the unit that moved
        battleScene.io.to(battleScene.id).emit("unitMoved", this, path);

        return path.length;
      }
    }
    return 0;
  }

  // locates an accessible target for a given spell
  locateTarget(battleScene: ServerBattleScene, spell: Spell) {
    for (let i = 0; i < battleScene.background.tiles.length; i++) {
      let tileX = i % battleScene.map.width;
      let tileY = Math.floor(i / battleScene.map.width);
      const startVec = { x: this.indX, y: this.indY };
      const targetVec = { x: tileX, y: tileY };
      if (
        battleScene.isUnitThere(tileX, tileY) &&
        this.isEnemy(battleScene.getUnitAtPos(tileX, tileY)) &&
        battleScene.isPosAccessibleToSpell(startVec, targetVec, spell)
      ) {
        return { x: tileX, y: tileY };
      }
    }
  }

  // return true if the given unit is a foe for this npc
  isEnemy(unit: ServerUnit) {
    return this.isTeamA ? !unit.isTeamA : unit.isTeamA;
  }

  isDead() {
    return this.hp <= 0;
  }
}
