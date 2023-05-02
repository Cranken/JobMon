import { renderHook } from '@testing-library/react-hooks';
import Cookies from "js-cookie";
import base64url from 'base64url';

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';


import { useGetUser, UserRole, AuthUser } from "@/utils/auth";

// describe("useGetUser", () => {
//   const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sImlhdCI6MTYxOTg1MzU1Mn0.ZzyrWhhGgReeA6G1IlHl8_i4U4zIWuLioeTmW6MCspA";

//   const user = {
//     Username: "testuser",
//     Roles: [UserRole.Admin],
//   };

//   beforeEach(() => {
//     Cookies.set("authToken", authToken);
//   });

//   afterEach(() => {
//     Cookies.remove("authToken");
//   });

//   it("should return an empty object when the auth token is not in the correct format", () => {
//     Cookies.set("Authorization", "invalid.token");
//     const { result } = renderHook(() => useGetUser());
//     expect(result.current).toEqual({} as AuthUser);
//   });

//   it("should return the correct user object when there is a valid auth token", () => {
//     const encodedData = base64url.encode(JSON.stringify(user));
//     const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sImlhdCI6MTYxOTg1MzU1Mn0.ZzyrWhhGgReeA6G1IlHl8_i4U4zIWuLioeTmW6MCspA";
//     Cookies.set("Authorization", authToken);
//     const { result } = renderHook(() => useGetUser());
//     expect(result.current).toEqual(user);
//   });

// });



describe('handlers', () => {
  describe('GET /user', () => {
    it('should return a user object', async () => {
      const user = await useGetUser();
      expect(user).toMatchObject({
        Username: 'JohnDoe',
        Roles: [UserRole.User],
      });
    });
  });

  describe('GET /admin', () => {
    it('should return an admin object', async () => {
      const user = await useGetUser();
      expect(user).toMatchObject({
        Username: 'Admin',
        Roles: [UserRole.Admin],
      });
    });
  });

  describe('GET /forbidden', () => {
    it('should return a 403 error response', async () => {
      const response = await fetch('/forbidden');
      expect(response.status).toEqual(403);
    });
  });
});
