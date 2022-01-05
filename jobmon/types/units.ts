import { checkBetween } from "../utils/utils";

interface UnitType {
  DisplayFormat: string;
  UsePrefix: boolean;
}

interface UnitsType {
  [key: string]: UnitType;
}

const Units: UnitsType = {
  Flops: {
    DisplayFormat: "FLOP/s",
    UsePrefix: true,
  },
  Bits: {
    DisplayFormat: "Bit/s",
    UsePrefix: true,
  },
  DegC: {
    DisplayFormat: "°C",
    UsePrefix: false,
  },
  Bytes: {
    DisplayFormat: "B/s",
    UsePrefix: true,
  },
  None: {
    DisplayFormat: "",
    UsePrefix: false,
  },
};

interface Prefix {
  Short: string;
  Exp: number;
}

interface PrefixesType {
  [key: string]: Prefix;
}

const Prefixes: PrefixesType = {
  kilo: {
    Short: "k",
    Exp: 3,
  },
  mega: {
    Short: "M",
    Exp: 6,
  },
  giga: {
    Short: "G",
    Exp: 9,
  },
  tera: {
    Short: "T",
    Exp: 12,
  },
  None: {
    Short: "",
    Exp: 0,
  },
};

export class Unit {
  readonly type: UnitType;
  readonly value: number;
  constructor(val: number, unit: string) {
    const baseUnit = getBaseUnit(unit);
    const prefix = getPrefix(unit, baseUnit);
    const exp = Math.pow(10, prefix.Exp);

    this.value = val * exp;
    this.type = baseUnit;
  }

  toString() {
    if (this.type.UsePrefix) {
      const bestPrefix = Object.keys(Prefixes).find((key) => {
        const exp = Math.pow(10, Prefixes[key].Exp);
        const value = this.value / exp;
        return 1 <= value && value < 1000;
      });
      if (bestPrefix) {
        const prefix = Prefixes[bestPrefix];
        const exp = Math.pow(10, prefix.Exp);
        const value = this.value / exp;
        return `${value} ${prefix.Short}${this.type.DisplayFormat}`;
      }
    }
    return `${this.value} ${this.type.DisplayFormat}`;
  }
}

const getBaseUnit = (str: string) => {
  let key = Object.keys(Units).find((val) =>
    str.includes(Units[val].DisplayFormat)
  );
  return key ? Units[key] : Units.None;
};

const getPrefix = (str: string, type: UnitType) => {
  if (type.UsePrefix) {
    const typeIdx = str.indexOf(type.DisplayFormat);
    if (typeIdx === -1) {
      return Prefixes.None;
    }
    const potentialPrefixIdx = typeIdx === 0 ? 0 : typeIdx - 1;
    const potentialPrefix = str.at(potentialPrefixIdx);
    const prefix = Object.keys(Prefixes).find(
      (val) => potentialPrefix === Prefixes[val].Short
    );
    return prefix ? Prefixes[prefix] : Prefixes.None;
  }
  return Prefixes.None;
};
