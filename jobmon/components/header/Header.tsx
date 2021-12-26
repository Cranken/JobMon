import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Spacer,
  Tooltip,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { useCookies } from "react-cookie";
import { MdLogout } from "react-icons/md";
import { useIsAuthenticated } from "../../utils/auth";

export const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  const headerBg = useColorModeValue("gray.400", "gray.500");
  const buttonBg = useColorModeValue("gray.500", "gray.400");
  const isAuthenticated = useIsAuthenticated();
  return (
    <header>
      <Flex bg={headerBg} p={2}>
        <Spacer flexGrow={1} />
        <Box flexGrow={1}>
          {isAuthenticated ? (
            <Input
              placeholder="Search user/job"
              onKeyPress={(ev) => searchHandler(ev.key, ev.currentTarget.value)}
              borderColor={"whiteAlpha.600"}
              _hover={{ borderColor: "whiteAlpha.900" }}
              _placeholder={{ color: "gray.900" }}
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
              <Button
                bg={buttonBg}
                onClick={() => removeCookie("Authorization", { path: "/" })}
              >
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
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/search/${term}`).then(
      (res) =>
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
