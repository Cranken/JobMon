import {
  Alert,
  AlertIcon,
  Button,
  Center,
  Checkbox,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { JobMonAppContext } from "./_app";

/**
 * Login is a React component rendered during the login phase.
 * @returns 
 */
export const Login = () => {
  const borderColor = useColorModeValue("gray.500", "whiteAlpha.500");
  const backgroundColor = useColorModeValue("white", "gray.700");
  const router = useRouter();
  const failed = router.query["login_failed"] !== undefined;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const submit = (e?: React.KeyboardEvent) => {
    if (!e || e.key == "Enter") {
      fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password, remember }),
        credentials: "include",
      }).then((resp) => {
        if (resp.ok) {
          router.push("/jobs");
          router.reload();
        } else {
          router.push("/login?login_failed");
          router.reload();
        }
      });
    }
  };

  useEffect(() => {
    router.prefetch("/jobs");
  }, [router]);

  return (
    <JobMonAppContext.Consumer>
      {(value: { headerHeight: number; setHeaderHeight: (n: number) => void; }) => (
        <Container bgGradient={'linear(to-r, #005aa0, #00a88f)'} p={0} maxWidth={"100vw"} w={'100%'} minHeight={'calc(100vh - ' + value.headerHeight + 'px)'}>
          <Center paddingTop={100}>
          <Stack
              w={["95%", "70%", "50%", "30%"]}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={borderColor}
              bg={backgroundColor}
              p={5}
            >
              <Heading>Welcome to Jobmon</Heading>
              <Text>
                Jobmon is a monitoring system for the HoreKa HPC
              </Text>
            </Stack>
            <Stack
              w={["95%", "70%", "50%", "30%"]}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={borderColor}
              bg={backgroundColor}
              p={5}
            >
              {failed ? (
                <Alert status="error">
                  <AlertIcon />
                  Login Failed
                </Alert>
              ) : null}
              <FormControl>
                <FormLabel htmlFor="username">Username</FormLabel>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  borderColor={borderColor}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={submit}
                />
                <FormLabel htmlFor="password">Password</FormLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  borderColor={borderColor}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={submit}
                />
                <Flex mt={5} justify="space-between">
                  <Checkbox
                    isChecked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  >
                    Remember Me
                  </Checkbox>
                  <Button onClick={() => submit()}>Login</Button>
                </Flex>
              </FormControl>
              <Divider />
              <Button
                onClick={() =>
                  router.push(
                    process.env.NEXT_PUBLIC_BACKEND_URL +
                    "/auth/oauth/login"
                  )
                }
              >
                Login with OIDC
              </Button>
            </Stack>
          </Center>
        </Container>
      )}
    </JobMonAppContext.Consumer>
  );
};

export default Login;
