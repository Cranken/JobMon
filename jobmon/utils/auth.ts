import base64url from "base64url";
import { useCookies } from "react-cookie";

export enum UserRole {
  Admin = "admin",
  User = "user",
  JobControl = "job-control",
}

interface AuthUser {
  Username: string;
  Role: UserRole;
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
  return { Username: data["Username"], Role: data["Role"] } as AuthUser;
};

export const useIsAuthenticated = () => {
  const user = useGetUser();
  return user.Role !== undefined && user.Username !== undefined;
};
