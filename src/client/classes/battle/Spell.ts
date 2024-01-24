import { UnitData } from "../../data/UnitData";
import { EffectOverTime } from "./EffectOverTime";

export class Spell {
  frame: number;
  minRange: number;
  maxRange: number;
  cost: number;
  name: string;
  // true if spell needs a line of sight to be cast
  lineOfSight: boolean;
  // true if spell is cast in a straight line only
  straightLine: boolean;
  damage: number;
  malusPM: number;
  malusPA: number;
  heal: number;
  bonusPA: number;
  bonusPM: number;
  // area of effect type (mono target by default)
  aoe: string;
  aoeSize: number;
  maxCooldown: number;
  cooldown: number;
  effectOverTime: EffectOverTime;
  // for summon spells, defines summoned unit
  summons: UnitData;
  // push target by x if positive, pull if negative (only works for spell in straight line)
  moveTargetBy: number;

  constructor(
    frame: number,
    minRange: number,
    maxRange: number,
    cost: number,
    name: string,
    lineOfSight: boolean,
    straightLine: boolean,
    damage: number,
    malusPM: number = 0,
    malusPA: number = 0,
    heal: number = 0,
    bonusPA: number = 0,
    bonusPM: number = 0,
    aoe: string = "monoTarget",
    aoeSize: number = 0,
    maxCooldown: number = 0,
    effectOverTime: EffectOverTime = null,
    summons: UnitData = null,
    moveTargetBy: number = 0
  ) {
    this.frame = frame;
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.cost = cost;
    this.name = name;
    this.lineOfSight = lineOfSight;
    this.straightLine = straightLine;
    this.damage = damage;
    this.malusPM = malusPM;
    this.malusPA = malusPA;
    this.heal = heal;
    this.bonusPA = bonusPA;
    this.bonusPM = bonusPM;
    this.aoe = aoe;
    this.aoeSize = aoeSize;
    this.maxCooldown = maxCooldown;
    this.cooldown = 0; // at battle start cooldowns are set to zero
    this.effectOverTime = effectOverTime;
    this.summons = summons;
    this.moveTargetBy = moveTargetBy;
  }
}
