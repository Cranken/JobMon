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
  HStack,
  Heading,
  Hide,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
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
  const backgroundColor = useColorModeValue("white", "gray.800");
  const router = useRouter();
  const failed = router.query["login_failed"] !== undefined;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [openLocalLogin, setOpenLocalLogin] = useState(false);
  const frontendOnly = true;

  const submit = (e?: React.KeyboardEvent) => {
    if (!e || e.key == "Enter") {
      fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password, remember, frontendOnly }),
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
        <Container p={0} maxWidth={"100vw"} w={'100vw'} minHeight={'calc(100vh - ' + value.headerHeight + 'px)'}>
          <HStack>
            <Container h={"100%"} w={{ base: "100vw", sm: "60vw", md: "50vw", lg: "40vw" , xl: "30vw" }} p={4} maxWidth={"100vw"}>
              <Center>
                <Heading>
                  Welcome to Jobmon
                </Heading>
              </Center>
              <Stack
                w={'100%'}
                maxWidth={"100vw"}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
                bg={backgroundColor}
                p={5}
              >
                <Text>
                  Jobmon monitors jobs running on the High Performance Computing system HoreKa.
                  Jobmon visualizes the usage of the computing system and helps you understand the performance of your job.
                </Text>
              </Stack>

              <Stack
                w={'100%'}
                maxWidth={"100vw"}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
                bg={backgroundColor}
                p={5}
                marginTop={5}
              >
                <Center>
                  <Heading>
                    Login
                  </Heading>
                </Center>
                {failed ? (
                  <Alert status="error">
                    <AlertIcon />
                    Login Failed
                  </Alert>
                ) : null}
                <Button
                  onClick={() =>
                    router.push(
                      process.env.NEXT_PUBLIC_BACKEND_URL +
                      "/auth/oauth/login"
                    )
                  }
                  bgGradient={'linear(to-r, horeka.blue, horeka.green)'}
                  color={"white"}
                  _hover={{
                    transform: 'scale(0.98)',
                  }}
                >
                  Login with OIDC
                </Button>
                <Button
                  onClick={() =>
                    setOpenLocalLogin(!openLocalLogin)
                  }
                  bgGradient={'linear(to-r, horeka.blue, horeka.green)'}
                  color={"white"}
                  _hover={{
                    transform: 'scale(0.98)',
                  }}
                >
                  Login with local account
                </Button>
                {openLocalLogin ?
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
                        borderColor={'horeka.blue'}
                      >
                        Remember Me
                      </Checkbox>
                      <Button
                        onClick={() => submit()}
                        bgColor={'horeka.green'}
                        color={"white"}
                        _hover={{
                          transform: 'scale(0.95)',
                        }}
                      >
                        Login
                      </Button>
                    </Flex>
                  </FormControl>
                  : null}
              </Stack>
            </Container>
            <Hide below="sm">
              <Image src="./login.jpg" h={'calc(100vh - ' + value.headerHeight + 'px)'} w={{ base: "00vw", sm: "40vw", md: "50vw", lg: "60vw" , xl: "70vw" }} fit={"cover"} />
            </Hide>
          </HStack>
        </Container>
      )}
    </JobMonAppContext.Consumer>
  );
};

export default Login;
