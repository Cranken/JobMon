/**
 * PrefixType represents a list of possible prefixes that can be used for different metric units.
 * Metric - it will use the usual data units like B, kB, MB, GB etc.
 * Exponential - it will use the 'e' notation for showing large numbers.
 */
enum PrefixType {
  None,
  Metric,
  Exponential,
}

/**
 * UnitType a unit type for a given metric
 */
interface UnitType {
  DisplayFormat: string;
  Prefix: PrefixType;
}

/**
 * UnitsType is the object that stores all possible metric unit types, the default unit type is the empty string.
 */
interface UnitsType {
  [key: string]: UnitType;
}

/**
 * Units is just an instance of UnitsType.
 */
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
  Watts: {
    DisplayFormat: "W",
    Prefix: PrefixType.Metric,
  },
  Reads: {
    DisplayFormat: "Reads/s",
    Prefix: PrefixType.None
  },
  Writes: {
    DisplayFormat: "Writes/s",
    Prefix: PrefixType.None
  },
  IOPS: {
    DisplayFormat: "IOPS/s",
    Prefix: PrefixType.Metric
  },
  MetaOPS: {
    DisplayFormat: "MetaOPS/s",
    Prefix: PrefixType.Metric
  },
  None: {
    DisplayFormat: "",
    Prefix: PrefixType.None,
  },
};

/**
 * Prefix represents a possible prefix used for a data units, it can be a symbol, 
 * e-notation, or the default base 10 prefix.
 */
interface Prefix {
  Short: string;
  Exp: number;
  Base: number;
}

/**
 * PrefixType represents the data unit prefixes.
 */
interface PrefixesType {
  [key: string]: Prefix;
}

/**
 * Prefixes is just an instance of PrefixType, where all the data prefixes are given
 */
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

/**
 * Unit class is a simple class used for representing a metrics unit.
 */
export class Unit {
  
  readonly type: UnitType;
  readonly value: number;
  /**
   * Constructor, initializes the unit type and value.
   * @param val - numerical value of the unit
   * @param unit - unit as a string, which is mapped to a possible unit given in Units object.
   */
  constructor(val: number, unit: string) {
    const baseUnit = getBaseUnit(unit);
    const prefix = getPrefix(unit, baseUnit);
    const exp = Math.pow(prefix.Base, prefix.Exp);

    this.value = val * exp;
    this.type = baseUnit;
  }

  /**
   * toString converts a unit to a string.
   * @param prefix - an optional argument defining the prefix type used for the unit.
   * @returns string version of the unit.
   */
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
          return `${value.toFixed(2)} ${prefix.Short}${this.type.DisplayFormat
            }`;
        }
        return `${this.value.toFixed(2)} ${this.type.DisplayFormat}`;
    }
  }

  /**
   * bestPrefix tries to guess the best possible prefix for the unit,
   * it is used mainly for Metric units.
   * @returns the best possible data prefix for the unit.
   */
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

/**
 * getBaseUnit finds a possible match for [str] in the Units object.
 * @param str - unit given as a string
 * @returns a UnitType which has the same DisplayFormat. 
 */
const getBaseUnit = (str: string) => {
  const key = Object.keys(Units).find((val) =>
    // str should be equal to one of the units DisplayFormat.  
    str === Units[val].DisplayFormat 
    // str.includes(Units[val].DisplayFormat)
  );
  return key ? Units[key] : Units.None;
};

/**
 * getPrefix for the given unit finds its prefix.
 * @param str - unit given as string.
 * @param type - UnitType where the search will be performed.
 * @returns the corresponding prefix, or a default one which is none.
 */
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
