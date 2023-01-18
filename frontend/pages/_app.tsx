import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Center, ChakraProvider } from "@chakra-ui/react";
import theme from "../styles/theme";
import Header from "../components/header/Header";
import { useIsAuthenticated } from "../utils/auth";
import { useRouter } from "next/router";
import { useEffect } from "react";
import dynamic from "next/dynamic";

function MyApp({ Component, pageProps }: AppProps) {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated && router.pathname !== "/login") {
      router.push("/login");
    }
    if (isAuthenticated && router.pathname === "/login") {
      router.push("/jobs");
    }
  });
  let redirectionString;
  if (!isAuthenticated && router.pathname !== "/login") {
    redirectionString = "Redirecting to login...";
  }
  if (isAuthenticated && router.pathname === "/login") {
    redirectionString = "Redirecting to jobs...";
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
