import { MinusIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Select, Stack } from "@chakra-ui/react";
import { PanelConfig } from "./PanelManager";

interface PanelControlProps<T> {
  children: JSX.Element;
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
    <Stack border="1px" borderColor="gray.700" borderRadius="md" m={2}>
      <Flex gap={2} m={2}>
        <IconButton
          aria-label={"remove-panel"}
          icon={<MinusIcon />}
          onClick={() => removePanel(panelConfig.Position)}
        ></IconButton>
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
          <option value="Partition">Partition</option>
          <option value="UserName">Username</option>
        </Select>
      </Flex>
      {children}
    </Stack>
  );
};
