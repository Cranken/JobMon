import "../styles/globals.css";
import type {AppProps} from "next/app";
import {Center, ChakraProvider} from "@chakra-ui/react";
import theme from "../styles/theme";
import Header from "../components/header/Header";
import {useGetUser, useHasNoAllowedRole, useIsAuthenticated} from "../utils/auth";
import {useRouter} from "next/router";
import React, {useEffect} from "react";
import dynamic from "next/dynamic";

/**
 * By deafult Next.js uses the App component to initialize pages. We override it to 
 * control the page initialization, adding global CSS, and keeping state when 
 * navigating pages
 * @param {Component, pageProps}: is the active page, so whenever we navigate between
 * routes Component will change to the new page. Therefore, any props that are sent to 
 * Component will be received by the page.
 * pageProps is an object with the initial props that were preloaded for your page by one of the 
 * data fetching methods, otherwise an empty objects.
 * @returns 
 */
function MyApp({ Component, pageProps }: AppProps) {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const user = useGetUser();
  let redirectionString;
  if (isAuthenticated &&
      router.pathname !== "/role-error" &&
      useHasNoAllowedRole(user)) {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/notify/admin", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        username: user.Username,
        roles: user.Roles
      }),
    });
    useEffect(() => {
      router.push("/role-error")
    });
    redirectionString = "Checking user-roles";
  }
  else {
    useEffect(() => {
      if (!isAuthenticated && router.pathname !== "/login") {
        router.push("/login");
      }
      if (isAuthenticated && router.pathname === "/login") {
        router.push("/jobs");
      }
    });

    if (!isAuthenticated && router.pathname !== "/login") {
      redirectionString = "Redirecting to login...";
    }
    if (isAuthenticated && router.pathname === "/login") {
      redirectionString = "Redirecting to jobs...";
    }
  }

  const content = redirectionString ? (
    <Center>{redirectionString}</Center>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <ChakraProvider theme={theme}>
      <Header />
      {content}
    </ChakraProvider>
  );
}

export default dynamic(() => Promise.resolve(MyApp), {
  ssr: false,
});
// export default MyApp;
