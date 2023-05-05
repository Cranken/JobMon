import { useGetUser, AuthUser, UserRole } from '@/utils/user';
import { renderHook } from '@testing-library/react-hooks/native';
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
    // TODO: Write unit tests for valid tokens.
    // test("returns AuthUser object when authToken is valid", () => {
    //     const authToken = "Dummy Token";
    //     const decodedToken = {
    //       Username: "admin",
    //       Roles: [UserRole.Admin],
    //     };
    //     (useCookies as jest.Mock).mockReturnValue([{ Authorization: authToken }]); 
    //     const { result } = renderHook(() => useGetUser());
    //     expect(result.current).toEqual(decodedToken);
    //   });
    
});
