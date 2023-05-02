import base64url from "base64url";
import Cookies from "js-cookie";
import { useCookies } from "react-cookie";

export enum UserRole {
  Admin = "admin",
  User = "user",
  JobControl = "job-control",
}

export interface AuthUser {
  Username: string;
  Roles: UserRole[];
}

export const useGetUser = () => {
  const [cookies] = useCookies(["Authorization"]);
  const authToken = cookies.Authorization as string;
  if (!authToken) {
    return {} as AuthUser;
  }
  const split = authToken.split(".");
  if (split.length !== 3) {
    return {} as AuthUser;
  }
  const data = JSON.parse(base64url.decode(split[1]));
  return { Username: data["Username"], Roles: data["Roles"] } as AuthUser;
};

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