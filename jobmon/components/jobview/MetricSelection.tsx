import {
  Checkbox,
  CheckboxGroup,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Grid,
} from "@chakra-ui/react";

interface MetricSelectionProps {
  metrics: string[];
  selectedMetrics: string[];
  setSelectedMetrics: (val: string[]) => void;
}

export const MetricSelection = ({
  metrics,
  selectedMetrics,
  setSelectedMetrics,
}: MetricSelectionProps) => {
  return (
    <Accordion allowToggle w="50%">
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
            defaultValue={selectedMetrics}
            value={selectedMetrics}
            onChange={(val) => setSelectedMetrics(val as string[])}
          >
            <Grid templateColumns="repeat(3, 5fr)" wrap="wrap">
              {metrics.map((metric) => (
                <Checkbox
                  key={metric}
                  value={metric}
                  isChecked={selectedMetrics.includes(metric)}
                >
                  {metric}
                </Checkbox>
              ))}
            </Grid>
          </CheckboxGroup>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
