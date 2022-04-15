import { AddIcon } from "@chakra-ui/icons";
import {
  Button,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { useStorageState } from "../../utils/utils";

export enum Panel {
  BarChart = "Bar Chart",
  HorizontalBarChart = "Horizontal Bar Chart",
  LineChart = "Line Chart",
  Histogram = "Histogram",
  BoxPlot = "Box Plot",
}

export interface PanelConfig<T> {
  Position: number;
  Type: Panel;
  Attribute: keyof T;
}

interface PanelManagerProps {
  AllowedPanels: Panel[];
  AddPanel: (p: Panel) => void;
}

export const PanelManager = ({
  AllowedPanels,
  AddPanel,
}: PanelManagerProps) => {
  return (
    <Flex>
      <Menu>
        <MenuButton as={Button} rightIcon={<AddIcon w={3} />}>
          Panel
        </MenuButton>
        <MenuList>
          {AllowedPanels.map((panel) => (
            <MenuItem key={panel} onClick={() => AddPanel(panel)}>
              {panel}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Flex>
  );
};

export const usePanels = <T,>(
  key: string
): [
  PanelConfig<T>[],
  (p: PanelConfig<T>) => void,
  (idx: number, p: keyof T) => void,
  (idx: number) => void
] => {
  const [panels, setPanels] = useStorageState<PanelConfig<T>[]>(key, []);
  const addPanel = (p: PanelConfig<T>) => setPanels([...panels, p]);
  const removePanel = (idx: number) =>
    setPanels(panels.filter((_, i) => i !== idx));
  const setPanelAttribute = (idx: number, p: keyof T) => {
    const newPanels = [...panels];
    newPanels[idx].Attribute = p;
    setPanels(newPanels);
  };
  return [panels, addPanel, setPanelAttribute, removePanel];
};
