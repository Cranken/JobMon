import base64url from "base64url";
import Cookies from "js-cookie";
import { useCookies } from "react-cookie";
import { UserRole, AuthUser, useGetUser } from "./user";

export const useIsAuthenticated = () => {
  const user = useGetUser();
  return user.Roles !== undefined && user.Username !== undefined;
};

export const useHasNoAllowedRole = (user: AuthUser) => {
  return (user.Roles.indexOf(UserRole.Admin) < 0) &&
      (user.Roles.indexOf(UserRole.User) < 0)
}


export const authFetch = (url: string, options?: RequestInit) => {
  const p = fetch(url.toString(), { credentials: "include", ...options }).then((res) => {
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      Cookies.remove("Authorization");
      return new Promise((_, reject) => reject("Unauthorized"));
    } else {
      return res.json();
    }
  });
  return p;
};