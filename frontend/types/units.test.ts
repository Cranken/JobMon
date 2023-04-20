import { getBaseUnit, getPrefix, Units, Prefixes } from "./units"


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
