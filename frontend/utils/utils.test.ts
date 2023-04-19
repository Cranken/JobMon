import { clamp } from "./utils"

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
