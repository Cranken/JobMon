import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { useHasNoAllowedRole, useIsAuthenticated, authFetch } from '@/utils/auth';
import { useGetUser, AuthUser, UserRole } from '@/utils/user';
import { renderHook } from '@testing-library/react-hooks';
import Cookies from 'js-cookie';


// mocks useGetUser
jest.mock('@/utils/user', () => ({
    ...jest.requireActual('@/utils/user'),
    useGetUser: jest.fn(),
}));

describe("useIsAuthenticated", () => {
    test("returns false when user object is empty", () => {
        (useGetUser as jest.Mock).mockReturnValue({}); 
        const { result } = renderHook(() => useIsAuthenticated());
        expect(result.current).toBeFalsy();
    });
  
    test("returns false when user object has no defined roles", () => {
        (useGetUser as jest.Mock).mockReturnValue({
            Roles: undefined,
            Username: "test",}); 
        const { result } = renderHook(() => useIsAuthenticated());
        expect(result.current).toBeFalsy();
    });

    test("returns false when user doesn't have a defined username", () => {
        (useGetUser as jest.Mock).mockReturnValue({
            Roles: UserRole.JobControl,
            Username: undefined,}); 
        const { result } = renderHook(() => useIsAuthenticated());
        expect(result.current).toBeFalsy();
    });

    test("returns true when user object has roles and username", () => {
        (useGetUser as jest.Mock).mockReturnValue({
            Roles: [UserRole.User],
            Username: "test",}); 
        const { result } = renderHook(() => useIsAuthenticated());
        expect(result.current).toBeTruthy();
    });

  });

  describe('useHasNoAllowedRole function', () => {
    test('should return true if user has no allowed roles', () => {
      const user: AuthUser = { Roles: [] , Username:"user"};
      const result = useHasNoAllowedRole(user);
      expect(result).toEqual(true);
    });
  
    test('should return false if user has admin role', () => {
      const user: AuthUser = { Roles: [UserRole.Admin], Username: "admin" };
      const result = useHasNoAllowedRole(user);
      expect(result).toEqual(false);
    });
  
    test('should return false if user has user role', () => {
      const user: AuthUser = { Roles: [UserRole.User], Username: "user" };
      const result = useHasNoAllowedRole(user);
      expect(result).toEqual(false);
    });
  
    test('should return false if user has both admin and user roles', () => {
      const user: AuthUser = { Roles: [UserRole.Admin, UserRole.User], Username: "user" };
      const result = useHasNoAllowedRole(user);
      expect(result).toEqual(false);
    });
  });

 