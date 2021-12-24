import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Input,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { KeyboardEvent } from "react";

export const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <header>
      <Flex bg={useColorModeValue("gray.400", "gray.500")} p={2}>
        <Box flexGrow={1}></Box>
        <Box flexGrow={1}>
          <Input
            placeholder="Search user/job"
            onKeyPress={(ev) => searchHandler(ev.key, ev.currentTarget.value)}
            borderColor={"whiteAlpha.600"}
            _hover={{ borderColor: "whiteAlpha.900" }}
            _placeholder={{ color: "gray.900" }}
          />
        </Box>
        <Flex flexGrow={1} justify={"end"}>
          <Button
            bg={useColorModeValue("gray.500", "gray.400")}
            onClick={toggleColorMode}
          >
            {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          </Button>
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
