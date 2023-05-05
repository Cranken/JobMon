import { getBaseUnit, getPrefix, Units, Prefixes, Unit } from "@/types/units"

describe("Tests getBaseUnit function", () => {
    test("Base unit of kB", () => {
        expect(getBaseUnit("kB")).toBe(Units.Byte)
    })    
    test("Base unit of TB", () => {
        expect(getBaseUnit("MB")).toBe(Units.Byte)
    })    
    test("Base unit of kB/s", () => {
        expect(getBaseUnit("kB/s")).toBe(Units.Bytes)
    })    
    test("Base unit of GB/s", () => {
        expect(getBaseUnit("GB/s")).toBe(Units.Bytes)
    })
    test("Base unit of kOP/s", () => {
        expect(getBaseUnit("kOP/s")).toBe(Units.OPs)
    })    
    test("Base unit of OP/s", () => {
        expect(getBaseUnit("OP/s")).toBe(Units.OPs)
    })
    test("Base unit of kW",  () => {
        expect(getBaseUnit("kW")).toBe(Units.Watts)
    })
    test("Base unit of kW",  () => {
        expect(getBaseUnit("kW")).toBe(Units.Watts)
    })
    test("Base unit of nothing",  () => {
        expect(getBaseUnit("")).toBe(Units.None)
    })
});

describe ("Tests getPrefix function", () => {
    test("Prefix of kB", () => {
        expect(getPrefix("kB", Units.Byte)).toBe(Prefixes.kilo)
    })
    test("Prefix of kB/s", () => {
        expect(getPrefix("kB/s", Units.Bytes)).toBe(Prefixes.kilo)
    })
    test("Prefix of kOP/s", () => {
        expect(getPrefix("kOP/s", Units.OPs)).toBe(Prefixes.kilo)
    })
    test("Prefix of kW", () => {
        expect(getPrefix("kW", Units.Watts)).toBe(Prefixes.kilo)
    })
    test("Prefix of GB", () => {
        expect(getPrefix("GB", Units.Byte)).toBe(Prefixes.giga)
    })
    test("Prefix of GB/s", () => {
        expect(getPrefix("GB/s", Units.Bytes)).toBe(Prefixes.giga)
    })
    test("Prefix of MW", () => {
        expect(getPrefix("MW", Units.Watts)).toBe(Prefixes.mega)
    })
    test("Prefix of nothing", () => {
        expect(getPrefix("", Units.None)).toBe(Prefixes.None)
    })
})


describe("Tests Unit class valueToString method", () => {
    test("1001 B ~~ 1.00 kB", () => {
        const unit = new Unit(1001, "B");
        expect(unit.valueToString()).toBe("1.00")
    })
    test("1001 kB ~~ 1.00 MB", () => {
        const unit = new Unit(1001, "kB");
        expect(unit.valueToString()).toBe("1.00")
    })
    test("999 OP/s doesn't change", () => {
        const unit = new Unit(999, "OP/s");
        expect(unit.valueToString()).toBe("999.00")
    })
    test("102846 OP/s ~~ 102.85 kOP/s", () => {
        const unit = new Unit(102846, "OP/s");
        expect(unit.valueToString()).toBe("102.85")
    })
    test("1028463 B/s ~~ 123.46 MB ", () => {
        const unit = new Unit(123456002, "kB");
        expect(unit.valueToString()).toBe("123.46")
    })
    
})

describe("Tests Unit class prefixToString method", () => {
    test("1001 B ~~ 1.00 kB", () => {
        const unit = new Unit(1001, "B");
        expect(unit.prefixToString()).toBe("kB")
    })
    test("1001 kB ~~ 1.00 MB", () => {
        const unit = new Unit(1001, "kB");
        expect(unit.prefixToString()).toBe("MB")
    })
    test("999 OP/s doesn't change", () => {
        const unit = new Unit(999, "OP/s");
        expect(unit.prefixToString()).toBe("OP/s")
    })
    test("102846 OP/s ~~ 1028.85 kOP/s", () => {
        const unit = new Unit(102846, "OP/s");
        expect(unit.prefixToString()).toBe("kOP/s")
    })
    test("123000 GB/s ~~ 123 TB/s ", () => {
        const unit = new Unit(12300, "GB/s");
        expect(unit.prefixToString()).toBe("TB/s")
    })
})

describe("Tests Unit class toString method", () => {
    test("1001 B ~~ 1.00 kB", () => {
        const unit = new Unit(1001, "B");
        expect(unit.toString()).toBe("1.00 kB")
    })
    test("1001 kB ~~ 1.00 MB", () => {
        const unit = new Unit(1001, "kB");
        expect(unit.toString()).toBe("1.00 MB")
    })
    test("999 OP/s doesn't change", () => {
        const unit = new Unit(999, "OP/s");
        expect(unit.toString()).toBe("999.00 OP/s")
    })
    test("102846 OP/s ~~ 102.85 kOP/s", () => {
        const unit = new Unit(102846, "OP/s");
        expect(unit.toString()).toBe("102.85 kOP/s")
    })
})


describe("Tests Unit class bestPrefix method", () => {
    test("1001 B ~~ 1.00 kB", () => {
        const unit = new Unit(1001, "B");
        expect(unit.bestPrefix()).toBe("kilo")
    })
    test("1001 kB ~~ 1.00 MB", () => {
        const unit = new Unit(1001, "kB");
        expect(unit.bestPrefix()).toBe("mega")
    })
    test("999 OP/s doesn't change", () => {
        const unit = new Unit(999, "OP/s");
        expect(unit.bestPrefix()).toBe("None")
    })
    test("102846 OP/s ~~ 102.85 kOP/s", () => {
        const unit = new Unit(102846, "OP/s");
        expect(unit.bestPrefix()).toBe("kilo")
    })
    test("123000 GB/s ~~ 123 TB/s ", () => {
        const unit = new Unit(12300, "GB/s");
        expect(unit.bestPrefix()).toBe("tera")
    })
})