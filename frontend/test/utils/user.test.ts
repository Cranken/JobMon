import { useGetUser, AuthUser, UserRole } from '@/utils/user';
import { renderHook } from '@testing-library/react-hooks';
import { useCookies } from 'react-cookie';


// mocks useCookies
jest.mock('react-cookie', () => ({
    useCookies: jest.fn(),
}));

describe("useGetUser", () => {
    test("returns empty object when no authToken is present in cookies", () => {
       (useCookies as jest.Mock).mockReturnValue([{ Authorization: undefined }, jest.fn()]); 
        const { result } = renderHook(() => useGetUser());
        expect(result.current).toEqual({} as AuthUser);
      });

    test("returns empty object when authToken is invalid", () => {
        (useCookies as jest.Mock).mockReturnValue([{ Authorization: "invalidAuthToken" }, jest.fn()]); 
        
        const { result } = renderHook(() => useGetUser());
    
        expect(result.current).toEqual({} as AuthUser);
      });

    test("returns AuthUser object when authToken is valid", () => {
        const authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJSb2xlcyI6WyJhZG1pbiJdLCJVc2VybmFtZSI6ImFkbWluIiwiaXNzIjoibW9uaXRvcmluZy1iYWNrZW5kIiwiZXhwIjoxNjgzMjg2NzU2LCJpYXQiOjE2ODMyMDAzNTZ9.9qGvJebevTB46Z-mWpTfCT2VaCjHB_zddYZAcH6Ikt0";
        const decodedToken = {
          Username: "admin",
          Roles: [UserRole.Admin],
        };
        (useCookies as jest.Mock).mockReturnValue([{ Authorization: authToken }]); 
        const { result } = renderHook(() => useGetUser());
        console.log(result.current);
        expect(result.current).toEqual(decodedToken);
      });
    
});
