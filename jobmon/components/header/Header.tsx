import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Input,
  Tooltip,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { EventHandler, KeyboardEvent } from "react";

export const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <header>
      <Flex bg={useColorModeValue("gray.400", "gray.500")} p={2}>
        <Box flexGrow={1}></Box>
        <Box flexGrow={1}>
          <Input
            placeholder="Search user/job"
            onKeyPress={searchHandler}
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

const searchHandler = (ev: KeyboardEvent<HTMLInputElement>) => {
  if (ev.key === "Enter") {
    console.log(ev.currentTarget.value);
  }
};

export default Header;
