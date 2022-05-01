import { MetricConfig } from "./../../types/job";
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
  metrics: MetricConfig[];
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
            <Grid templateColumns="repeat(3, 10fr)" wrap="wrap" gap={2}>
              {metrics.map((metric) => (
                <Checkbox
                  key={metric.Measurement}
                  value={metric.Measurement}
                  isChecked={selectedMetrics.includes(metric.Measurement)}
                >
                  {metric.DisplayName}
                </Checkbox>
              ))}
            </Grid>
          </CheckboxGroup>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
