import { MoonIcon, SettingsIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Stack,
  Textarea,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { useCookies } from "react-cookie";
import { MdLogout } from "react-icons/md";
import { useIsAuthenticated } from "../../utils/auth";
import { useGetUser } from "./../../utils/auth";

export const Header = () => {
  const user = useGetUser();
  const { colorMode, toggleColorMode } = useColorMode();
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  const headerBg = useColorModeValue("gray.400", "gray.500");
  const buttonBg = useColorModeValue("gray.500", "gray.400");
  const searchInputColor = useColorModeValue("gray.800", "whiteAlpha.900");
  const isAuthenticated = useIsAuthenticated();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [apiKey, setApiKey] = useState("");

  const logout = () => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/logout", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(user),
    }).then(() => removeCookie("Authorization", { path: "/" }));
  };

  const generateApiKey = () => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/generateAPIKey", {
      method: "POST",
      credentials: "include",
    }).then((resp) =>
      resp.body
        ?.getReader()
        .read()
        .then((val) => {
          if (val.value) {
            setApiKey(new TextDecoder().decode(val.value));
          }
        })
    );
  };
  return (
    <header>
      <>
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Modal Title</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Stack gap={2}>
                <Button onClick={() => generateApiKey()}>
                  Generate API Key
                </Button>
                <Textarea value={apiKey} isReadOnly>
                  test
                </Textarea>
              </Stack>
            </ModalBody>

            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
      <Flex bg={headerBg} p={2}>
        <Flex flexGrow={1}>
          {isAuthenticated ? (
            <Link href="/jobs">
              <Button bg={buttonBg}>Home</Button>
            </Link>
          ) : null}
        </Flex>
        <Box flexGrow={1}>
          {isAuthenticated ? (
            <Input
              placeholder="Search user/job"
              onKeyPress={(ev) => searchHandler(ev.key, ev.currentTarget.value)}
              borderColor={searchInputColor}
              _placeholder={{ color: searchInputColor }}
            />
          ) : null}
        </Box>
        <Flex flexGrow={1} justify={"end"} gap={2}>
          {isAuthenticated ? (
            <Tooltip label="Logout">
              <Button bg={buttonBg} onClick={onOpen}>
                <SettingsIcon />
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip label="Toggle Color Mode">
            <Button bg={buttonBg} onClick={toggleColorMode}>
              {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>
          </Tooltip>
          {isAuthenticated && user.Role === "admin" ? (
            <Tooltip label="Logout">
              <Button bg={buttonBg} onClick={() => logout()}>
                <Icon as={MdLogout} />
              </Button>
            </Tooltip>
          ) : null}
        </Flex>
      </Flex>
    </header>
  );
};

const searchHandler = (key: string, term: string) => {
  if (key === "Enter") {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/search/${term}`, {
      credentials: "include",
    }).then((res) =>
      res.text().then((val) => {
        const split = val.split(":");
        if (split.length !== 2) {
          return;
        }
        switch (split[0]) {
          case "job":
            window.location.href = `/job/${split[1]}`;
            return;
          case "user":
            window.location.href = `/jobs?user=${split[1]}`;
            return;
        }
      })
    );
  }
};

export default Header;
