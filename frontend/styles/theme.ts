import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};


const theme = extendTheme({
  config,
  colors: {
    // Custom colors

    // Horeka are the tow colors used in the horeka logo
    horeka: {
      100: "#005aa0", // Blue
      900: "#00a88f", // Green
    }
  },
});

export default theme;
