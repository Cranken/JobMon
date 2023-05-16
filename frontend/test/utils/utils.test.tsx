import { checkBetween, clamp, groupBy, useIsWideDevice } from "@/utils/utils";
import { render } from "@testing-library/react";
import React, { useEffect } from "react";


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

describe("Tests useIsWideDevice effect", () => {
    /**
     * Properties of TestC
     */
    interface ITestCProps {
        setWideState: (v: boolean) => void;
    }
    
    /**
     * React component needed to test useIsWideDevice.
     * This component uses useIsWideDevice with a width-boundary of 500.
     * @param setWideState is used to transfer the width state to the outside.
     */
    const TestC = ({setWideState}: ITestCProps) => {
        const isWide = useIsWideDevice(500);
        useEffect(() => {
            setWideState(isWide)
        }, [isWide])
        return (
            <div/>
        );
    }
    test("decide wide device", () => {
        global.innerWidth = 501;
        let isWide = false;
        const setWide = (v: boolean) => {
             isWide = v;
        };
        render(< TestC setWideState={setWide} />)
        expect(isWide).toBeTruthy
    })
    test("decide small device", () => {
        global.innerWidth = 500;
        let isWide = false;
        const setWide = (v: boolean) => {
             isWide = v;
        };
        render(< TestC setWideState={setWide} />)
        expect(isWide).toBeFalsy
    })
    test("decide change device", () => {
        // Wide device
        global.innerWidth = 501;
        let isWide = false;
        const setWide = (v: boolean) => {
             isWide = v;
        };
        render(< TestC setWideState={setWide} />)
        expect(isWide).toBeTruthy

        //Change to small device
        global.innerWidth = 500;
        global.dispatchEvent(new Event('resize'));
        expect(isWide).toBeFalsy

        //Change back to wide device
        global.innerWidth = 501;
        global.dispatchEvent(new Event('resize'));
        expect(isWide).toBeTruthy
    })
})
