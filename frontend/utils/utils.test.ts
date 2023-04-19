import { checkBetween, clamp, groupBy } from "./utils"

describe("Tests clamp function", () => {
    test("value smaller than interval", () => {
        expect(clamp(0, 1, 3)).toBe(1)
    })
    test("value bigger than interval", () => {
        expect(clamp(4, 1, 3)).toBe(3)
    })
    test("value in interval", () => {
        expect(clamp(2, 1, 3)).toBe(2)
    })
});

describe("Tests checkBetween function", () => {
    test("value between", () => {
        expect(checkBetween(1,3,2)).toBeTruthy
    })
    test("value not between", () => {
        expect(checkBetween(1, 2, 3)).toBeFalsy
    })
    test("value on the edges of the interval", () => {
        expect(checkBetween(1, 2, 1)).toBeTruthy
        expect(checkBetween(1, 2, 2)).toBeTruthy
    })
});

describe("Tests groupBy function", () => {
    test("group empty array", () => {
        expect(groupBy([], (_) => {return ""})).toStrictEqual({})
    })
    test("group number array", () => {
        expect(groupBy([1,2,3,4,4,2], (n: number) => {return "" + n})).toStrictEqual({
            "1": [1],
            "2": [2,2],
            "3": [3],
            "4": [4,4]
        })
    })
})
