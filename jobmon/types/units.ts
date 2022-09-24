enum PrefixType {
  None,
  Metric,
  Exponential,
}
interface UnitType {
  DisplayFormat: string;
  Prefix: PrefixType;
}

interface UnitsType {
  [key: string]: UnitType;
}

const Units: UnitsType = {
  Flops: {
    DisplayFormat: "FLOP/s",
    Prefix: PrefixType.Metric,
  },
  Bits: {
    DisplayFormat: "Bit/s",
    Prefix: PrefixType.Metric,
  },
  DegC: {
    DisplayFormat: "°C",
    Prefix: PrefixType.None,
  },
  Bytes: {
    DisplayFormat: "B/s",
    Prefix: PrefixType.Metric,
  },
  Byte: {
    DisplayFormat: "B",
    Prefix: PrefixType.Metric,
  },
  Percentage: {
    DisplayFormat: "%",
    Prefix: PrefixType.None,
  },
  Packets: {
    DisplayFormat: "Packet/s",
    Prefix: PrefixType.Exponential,
  },
  None: {
    DisplayFormat: "",
    Prefix: PrefixType.None,
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
    switch (this.type.Prefix) {
      case PrefixType.Exponential:
        return this.value.toExponential(2) + ` ${this.type.DisplayFormat}`;
      default:
        let best = this.bestPrefix();
        best = prefix ? prefix : best;
        if (best) {
          const prefix = Prefixes[best];
          const exp = Math.pow(prefix.Base, prefix.Exp);
          const value = this.value / exp;
          return `${value.toFixed(2)} ${prefix.Short}${
            this.type.DisplayFormat
          }`;
        }
        return `${this.value.toFixed(2)} ${this.type.DisplayFormat}`;
    }
  }

  bestPrefix() {
    switch (this.type.Prefix) {
      case PrefixType.Metric:
        return Object.keys(Prefixes).find((key) => {
          const exp = Math.pow(Prefixes[key].Base, Prefixes[key].Exp);
          const value = this.value / exp;
          return 1 <= value && value < 1000;
        });
      case PrefixType.Exponential:
        return "None";
    }
  }
}

const getBaseUnit = (str: string) => {
  let key = Object.keys(Units).find((val) =>
    str.includes(Units[val].DisplayFormat)
  );
  return key ? Units[key] : Units.None;
};

const getPrefix = (str: string, type: UnitType) => {
  switch (type.Prefix) {
    case PrefixType.Metric:
      const prefix = Object.keys(Prefixes).find((key) =>
        str.includes(`${Prefixes[key].Short}${type.DisplayFormat}`)
      );
      return prefix ? Prefixes[prefix] : Prefixes.None;
  }
  return Prefixes.None;
};
