import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Center,
  Checkbox,
  CheckboxGroup,
  Grid,
} from "@chakra-ui/react";

export const OPanel = {
  Partition: "Partition",
  Username: "Username",
  NumNodes: "Number of Nodes",
  GroupName: "Groupname",
  JobLength: "Job Length",
  ComputeTime: "Compute Time",
} as const;

export type Panel = keyof typeof OPanel;

export interface PanelConfig<T> {
  Position: number;
  Type: Panel;
}

interface PanelManagerProps {
  selectedPanels: Panel[];
  setSelectedPanels: (p: Panel[]) => void;
}

export const PanelManager = ({
  selectedPanels,
  setSelectedPanels,
}: PanelManagerProps) => {
  return (
    <Center>
      <Accordion allowToggle mb={2} w="25%">
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                Metrics
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <CheckboxGroup
              defaultValue={selectedPanels}
              value={selectedPanels}
              onChange={(val) =>
                setSelectedPanels(val.map((val) => val as Panel))
              }
            >
              <Grid templateColumns="repeat(3, 10fr)" wrap="wrap" gap={2}>
                {Object.keys(OPanel).map((panel) => (
                  <Checkbox
                    key={panel}
                    value={panel}
                    isChecked={selectedPanels.includes(panel as Panel)}
                  >
                    {OPanel[panel as Panel]}
                  </Checkbox>
                ))}
              </Grid>
            </CheckboxGroup>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Center>
  );
};
