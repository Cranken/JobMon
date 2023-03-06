/**
 * Maps booleans to strings.
 * SelectionMap is used to store selections made by the user
 */
export type SelectionMap = { [key: string]: boolean; };

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
