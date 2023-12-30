import { EffectOverTime } from "../../client/classes/battle/EffectOverTime";
import { Spell } from "../../client/classes/battle/Spell";
import { javelin, punch, sting, heal } from "../../client/data/SpellData";
import { unitsAvailable } from "../../client/data/UnitData";
import { ServerBattleScene } from "./ServerBattleScene";

export class ServerUnit {
  isReady: boolean;
  id: string;
  isPlayable: boolean;
  isAlly: boolean;
  indX: number;
  indY: number;
  type: string;
  maxPm: number;
  maxPa: number;
  maxHp: number;
  pm: number;
  pa: number;
  hp: number;
  spells: Spell[] = [];
  effectOverTime: EffectOverTime;
  summonedUnits: ServerUnit[] = [];

  constructor(
    battleScene: ServerBattleScene,
    isReady: boolean,
    id: string,
    isPlayable: boolean,
    isAlly: boolean,
    indX: number,
    indY: number,
    type: string
  ) {
    this.isReady = isReady;
    this.id = id;
    this.isPlayable = isPlayable;
    this.isAlly = isAlly;
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
  }

  undergoSpell(spell: Spell) {
    this.hp -= spell.damage;
    this.hp = Math.min(this.hp + spell.heal, this.maxHp);
    this.pm -= spell.malusPM;
    this.pm += spell.bonusPM;
    this.pa -= spell.malusPA;
    this.pa += spell.bonusPA;

    this.pm = Math.max(this.pm, 0);
    this.pa = Math.max(this.pa, 0);

    if (spell.effectOverTime) {
      this.addEffectOverTime(spell.effectOverTime);
    }
  }

  addEffectOverTime(effectOverTime: EffectOverTime) {
    this.effectOverTime = { ...effectOverTime };
  }
}
