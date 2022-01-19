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
  Byte: {
    DisplayFormat: "B",
    UsePrefix: true,
  },
  Percentage: {
    DisplayFormat: "%",
    UsePrefix: false,
  },
  Packets: {
    DisplayFormat: "Packet/s",
    UsePrefix: false,
  },
  None: {
    DisplayFormat: "",
    UsePrefix: false,
  },
};

interface Prefix {
  Short: string;
  Exp: number;
  Base: number;
}

interface PrefixesType {
  [key: string]: Prefix;
}

const Prefixes: PrefixesType = {
  kilo: {
    Short: "k",
    Exp: 3,
    Base: 10,
  },
  mega: {
    Short: "M",
    Exp: 6,
    Base: 10,
  },
  giga: {
    Short: "G",
    Exp: 9,
    Base: 10,
  },
  tera: {
    Short: "T",
    Exp: 12,
    Base: 10,
  },
  kibi: {
    Short: "Ki",
    Exp: 10,
    Base: 2,
  },
  mebi: {
    Short: "Mi",
    Exp: 20,
    Base: 2,
  },
  gibi: {
    Short: "Gi",
    Exp: 30,
    Base: 2,
  },
  tebi: {
    Short: "Ti",
    Exp: 40,
    Base: 2,
  },
  None: {
    Short: "",
    Exp: 0,
    Base: 10,
  },
};

export class Unit {
  readonly type: UnitType;
  readonly value: number;
  constructor(val: number, unit: string) {
    const baseUnit = getBaseUnit(unit);
    const prefix = getPrefix(unit, baseUnit);
    const exp = Math.pow(prefix.Base, prefix.Exp);

    this.value = val * exp;
    this.type = baseUnit;
  }

  toString(prefix?: string) {
    let best = this.bestPrefix();
    best = prefix ? prefix : best;
    if (best) {
      const prefix = Prefixes[best];
      const exp = Math.pow(prefix.Base, prefix.Exp);
      const value = this.value / exp;
      return `${value.toFixed(2)} ${prefix.Short}${this.type.DisplayFormat}`;
    }
    return `${this.value.toFixed(2)} ${this.type.DisplayFormat}`;
  }

  bestPrefix() {
    let prefix;
    if (this.type.UsePrefix) {
      prefix = Object.keys(Prefixes).find((key) => {
        const exp = Math.pow(Prefixes[key].Base, Prefixes[key].Exp);
        const value = this.value / exp;
        return 1 <= value && value < 1000;
      });
    }
    return prefix;
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
    const prefix = Object.keys(Prefixes).find((key) =>
      str.includes(`${Prefixes[key].Short}${type.DisplayFormat}`)
    );
    return prefix ? Prefixes[prefix] : Prefixes.None;
  }
  return Prefixes.None;
};