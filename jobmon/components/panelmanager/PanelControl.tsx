import { MinusIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Select, Stack } from "@chakra-ui/react";
import { PanelConfig } from "./PanelManager";

interface PanelControlProps<T> {
  children: JSX.Element[];
  removePanel: (idx: number) => void;
  panelConfig: PanelConfig<T>;
  setPanelAttribute: (idx: number, p: keyof T) => void;
}

export const PanelControl = <T,>({
  children,
  removePanel,
  panelConfig,
  setPanelAttribute,
}: PanelControlProps<T>) => {
  return (
    <Flex gap={2} m={2} justify="space-between">
      <Select
        onChange={(event) =>
          setPanelAttribute(
            panelConfig.Position,
            event.currentTarget.value as keyof T
          )
        }
        maxW={"max"}
        value={panelConfig.Attribute.toString()}
      >
        {children}
      </Select>
      <IconButton
        aria-label={"remove-panel"}
        icon={<MinusIcon />}
        onClick={() => removePanel(panelConfig.Position)}
      ></IconButton>
    </Flex>
  );
};
