import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Center, ChakraProvider } from "@chakra-ui/react";
import theme from "../styles/theme";
import Header from "@/components/header/Header";
import { useHasNoAllowedRole, useIsAuthenticated } from "@/utils/auth";
import { useGetUser } from "@/utils/user";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import dynamic from "next/dynamic";

/**
 * App context provided to all pages and components.
 */
export const JobMonAppContext = React.createContext({
  /**
   * The current hight of the header.
   */
  headerHeight: 0,

  /**
   * A callback function to set the hight of the header.
   * @param n The hight to set.
   */
  setHeaderHeight: (n: number) => { console.log(n) },
});

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
  const [headerHeight, setHeaderHeight] = React.useState(0);

  let redirectionString;
  if (isAuthenticated &&
    router.pathname !== "/role-error" &&
    useHasNoAllowedRole(user)) {

    useEffect(() => {
      router.push("/role-error")
    });
    redirectionString = "Checking user-roles";
  }
  else if (isAuthenticated &&
    router.pathname == "/role-error" &&
    !useHasNoAllowedRole(user)) {

    useEffect(() => {
      router.push("/jobs")
    });

    redirectionString = "Redirecting to jobs...";
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
    <JobMonAppContext.Provider value={{ headerHeight, setHeaderHeight }}>
      <ChakraProvider theme={theme}>
        <Header pathname={router.pathname} setHeaderHeight={setHeaderHeight} />
        {content}
      </ChakraProvider>
    </JobMonAppContext.Provider>
  );
}

export default dynamic(() => Promise.resolve(MyApp), {
  ssr: false,
});
// export default MyApp;
