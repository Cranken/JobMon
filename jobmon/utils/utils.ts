export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export const checkBetween = (d1: Date, d2: Date, point: Date) => {
  return d1 < point && point < d2;
};
