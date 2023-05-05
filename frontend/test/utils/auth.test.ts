import { rest } from 'msw';
import { useHasNoAllowedRole, useIsAuthenticated, authFetch } from '@/utils/auth';
import { useGetUser, AuthUser, UserRole } from '@/utils/user';
import { renderHook } from '@testing-library/react-hooks';
import { server } from '@/mocks/server';



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

  
describe("authFetch", () => {
  test("sends credentials with fetch request", async () => {
    const url = "/api/test";
    const options = { method: "GET" };
  
    server.use(
      rest.get(url, (req, res, ctx) => {
        expect(req.credentials).toBe("include");
        return res(ctx.json({ success: true }));
      })
    );
  
    await authFetch(url, options);
  });
  
  test("returns response if request is successful", async () => {
    const url = "/api/test";
    const options = { method: "GET" };
    const responseData = { success: true };
  
    server.use(
      rest.get(url, (req, res, ctx) => {
        return res(ctx.json(responseData));
      })
    );
  
    const response = await authFetch(url, options);
    expect(response).toEqual(responseData);
  });
  
  test("throws an error if request is unauthorized", async () => {
    const url = "/api/test";
    const options = { method: "GET" };
  
    server.use(
      rest.get(url, (req, res, ctx) => {
        return res(ctx.status(401));
      })
    );
  
    await expect(authFetch(url, options)).rejects.toEqual("Unauthorized");
    });
});