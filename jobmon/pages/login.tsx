import {
  Alert,
  AlertIcon,
  Button,
  Center,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useRouter } from "next/router";

export const Login = () => {
  const borderColor = useColorModeValue("gray.500", "whiteAlpha.500");
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
          window.location.href = "/jobs";
        } else {
          window.location.href = "/login?login_failed";
        }
      });
    }
  };

  return (
    <Center h="500px">
      <Stack
        w="25%"
        borderWidth="1px"
        borderRadius="lg"
        borderColor={borderColor}
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
      </Stack>
    </Center>
  );
};

export default Login;
