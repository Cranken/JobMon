import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  LinkBox,
  LinkOverlay,
  Tooltip,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { useCookies } from "react-cookie";
import { MdLogout } from "react-icons/md";
import { useIsAuthenticated, UserRole } from "../../utils/auth";
import { useGetUser } from "../../utils/auth";
import React from "react";

export const Header = () => {
  const user = useGetUser();
  const { colorMode, toggleColorMode } = useColorMode();
  const [, , removeCookie] = useCookies(["Authorization"]);
  const headerBg = useColorModeValue("gray.400", "gray.500");
  const buttonBg = useColorModeValue("gray.500", "gray.400");
  const searchInputColor = useColorModeValue("gray.800", "whiteAlpha.900");
  const isAuthenticated = useIsAuthenticated();

  const logout = () => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/logout", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(user),
    }).then(() => removeCookie("Authorization", { path: "/" }));
  };

  return (
    <header>
      <Flex bg={headerBg} p={2}>
        <Flex flexGrow={1} gap={2}>
          {isAuthenticated ? (
            <>
              <LinkBox>
                <LinkOverlay href="/jobs">
                  <Button bg={buttonBg}>Home</Button>
                </LinkOverlay>
              </LinkBox>
              {user.Roles?.includes(UserRole.Admin) ?? false ? (
                <LinkBox>
                  <LinkOverlay href="/statistics">
                    <Button bg={buttonBg}>Statistics</Button>
                  </LinkOverlay>
                </LinkBox>
              ) : null}
              {user.Roles?.includes(UserRole.Admin) ?? false ? (
                <LinkBox>
                  <LinkOverlay href="/settings">
                    <Button bg={buttonBg}>Admin</Button>
                  </LinkOverlay>
                </LinkBox>
              ) : null}
            </>
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
          <Tooltip label="Toggle Color Mode">
            <Button bg={buttonBg} onClick={toggleColorMode}>
              {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>
          </Tooltip>
          {isAuthenticated ? (
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
