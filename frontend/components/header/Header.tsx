import { HamburgerIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Icon,
  Input,
  LinkBox,
  LinkOverlay,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useCookies } from "react-cookie";
import { MdLogout } from "react-icons/md";
import {useHasNoAllowedRole, useIsAuthenticated } from "@/utils/auth";
import { useGetUser, UserRole } from "@/utils/user";
import React, { useEffect, useState } from "react";
import { useIsWideDevice } from "@/utils/utils";

/**
 * On devices with a lower width than defined here, the header will switch to the one defined as the small device header
 */
const SMALL_DEVICE_WIDTH_BOUNDARY = 700;

/**
 * Props for the header component
 */
interface HeaderProps {
  /**
   * The pathname on which the website currently renders
   */
  pathname: string
}

/**
 * The header that gets displayed on each page.
 * This header automatically switches the shown content based on the currently authenticated user.
 * Depending on the width of the device this page automatically switches between two options.
 * 
 * @param param0 Properties
 * @returns The component
 */
export const Header = ({pathname} : HeaderProps) => {
  const user = useGetUser();
  const { colorMode, toggleColorMode } = useColorMode();
  const [, , removeCookie] = useCookies(["Authorization"]);
  const headerBg = useColorModeValue("gray.400", "gray.500");
  const buttonBg = useColorModeValue("gray.500", "gray.400");
  const searchInputColor = useColorModeValue("gray.800", "whiteAlpha.900");
  const isAuthenticated = useIsAuthenticated();
  const hasRole = (user.Roles) ? !useHasNoAllowedRole(user) : false;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isWide = useIsWideDevice();

  const logout = () => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/logout", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(user),
    }).then(() => removeCookie("Authorization", { path: "/" }));
  };

  // Small device header
  if (!isWide) {
    return (
      <header>
        <Flex bg={headerBg} p={2}>
          {isAuthenticated && hasRole ? (
            <>
              <Button bg={buttonBg} onClick={onOpen} mr={3}>
                <HamburgerIcon />
              </Button>
              <Drawer
                isOpen={isOpen}
                placement='left'
                onClose={onClose}
              >
                <DrawerOverlay />
                <DrawerContent>
                  <DrawerCloseButton />
                  <DrawerHeader>Menu</DrawerHeader>
                  <DrawerBody>
                    <LinkBox>
                      <LinkOverlay href="/jobs">
                        <Button
                          bg={buttonBg}
                          w={"100%"}
                          isActive={pathname == "/jobs"}
                        >
                          Jobs
                        </Button>
                      </LinkOverlay>
                    </LinkBox>
                    {user.Roles?.includes(UserRole.Admin) ?? false ? (
                      <LinkBox mt={4}>
                        <LinkOverlay href="/statistics">
                          <Button
                            bg={buttonBg}
                            w={"100%"}
                            isActive={pathname == "/statistics"}
                          >
                            Statistics
                          </Button>
                        </LinkOverlay>
                      </LinkBox>
                    ) : null}
                    {user.Roles?.includes(UserRole.Admin) ?? false ? (
                      <LinkBox mt={4}>
                        <LinkOverlay href="/settings">
                          <Button
                            bg={buttonBg}
                            w={"100%"}
                            isActive={pathname == "/settings"}
                          >
                            Settings
                          </Button>
                        </LinkOverlay>
                      </LinkBox>
                    ) : null}
                  </DrawerBody>
                </DrawerContent>
              </Drawer>
            </>
          ) : null }
          <Box flexGrow={1}>
            {isAuthenticated && hasRole ? (
              <Input
                placeholder="Search user/job"
                onKeyPress={(ev) => searchHandler(ev.key, ev.currentTarget.value)}
                borderColor={searchInputColor}
                _placeholder={{ color: searchInputColor }}
              />
            ) : null}
          </Box>
          <Flex flexGrow={1} justify={"end"} gap={2} pl={2}>
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
  }

  // Wide device header
  return (
    <header>
      <Flex bg={headerBg} p={2}>
        <Flex flexGrow={1} gap={2}>
          {isAuthenticated && hasRole ? (
            <>
              <LinkBox>
                <LinkOverlay href="/jobs">
                  <Button bg={buttonBg} isActive={pathname == "/jobs"}>Jobs</Button>
                </LinkOverlay>
              </LinkBox>
              {user.Roles?.includes(UserRole.Admin) ?? false ? (
                <LinkBox>
                  <LinkOverlay href="/statistics">
                    <Button bg={buttonBg} isActive={pathname == "/statistics"}>Statistics</Button>
                  </LinkOverlay>
                </LinkBox>
              ) : null}
              {user.Roles?.includes(UserRole.Admin) ?? false ? (
                <LinkBox>
                  <LinkOverlay href="/settings">
                    <Button bg={buttonBg} isActive={pathname == "/settings"}>Settings</Button>
                  </LinkOverlay>
                </LinkBox>
              ) : null}
              {/* {user.Roles?.includes(UserRole.Admin) ?? false ? (
                <LinkBox>
                  <LinkOverlay href="/bad_jobs">
                    <Button bg={buttonBg}>Optimization Candidates</Button>
                  </LinkOverlay>
                </LinkBox>
              ): null} */}
            </>
          ) : null}
        </Flex>
        <Box flexGrow={1}>
          {isAuthenticated && hasRole ? (
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
