import base64url from "base64url";
import Cookies from "js-cookie";
import { useCookies } from "react-cookie";

/**
 * UserRole defines roles for users
 */
export enum UserRole {
  Admin = "admin",
  User = "user",
  JobControl = "job-control",
}

/**
 * AuthUser specifies an authenticated user with its username and its roles
 */
interface AuthUser {
  Username: string;
  Roles: UserRole[];
}

/**
 * Constructs a AuthUser instance for the currently used user. The user is read from the browser's cookies.
 * @returns The user as an AuthUser instance.
 */
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

/**
 * Checks if the currently used user is valid. The user therefore is read from the browser's cookies.
 * A user is seen as authenticated when his role and his username have a value unlike undefined.
 */
export const useIsAuthenticated = () => {
  const user = useGetUser();
  return user.Roles !== undefined && user.Username !== undefined;
};

/**
 * Fetches data authenticated. This methode executes the request specified by url and options with included credentials.
 * This method is useful when accessing protected areas in the backend.
 * @param url The url to execute the request on.
 * @param options The options for the request.
 */
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