// Polyfill "window.fetch" used in the React component.
import 'whatwg-fetch'

// Extend Jest "expect" functionality with Testing Library Assertions.
import '@testing-library/jest-dom'

import '@testing-library/jest-dom/extend-expect';

import { server } from './mocks/server'

global.matchMedia = global.matchMedia || function () {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
};

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
