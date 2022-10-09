import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormLabel,
  Grid,
  HStack,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Select,
  Stack,
} from "@chakra-ui/react";
import { Field, Form, Formik } from "formik";
import React, { useState } from "react";
import { Configuration } from "./../../types/config";
import { AggFn, MetricConfig } from "./../../types/job";

interface IMetricsViewProps {
  config: Configuration;
  setConfig: (c: Configuration) => void;
}

const MetricsView = ({ config, setConfig }: IMetricsViewProps) => {
  const [lConfig, setLConfig] = useState(config);
  if (!lConfig) {
    return null;
  }
  return (
    // <Grid gap={5} templateColumns="repeat(2, 1fr)">
    <Stack gap={2}>
      <Accordion allowMultiple>
        {lConfig.Metrics.map((m, i) => (
          <MetricItem
            // Hack to avoid duplicate keys if adding multiple new (empty) metrics
            key={m.DisplayName + i}
            metricConfig={m}
            setMetricConfig={(m: MetricConfig, del: boolean = false) => {
              let curConfig = { ...lConfig };
              if (del) {
                delete curConfig.Metrics[i];
              } else {
                curConfig.Metrics[i] = m;
              }
              setConfig(curConfig);
            }} />
        ))}
      </Accordion>
      <Box>
        <Button onClick={() => {
          let curConfig = { ...lConfig };
          curConfig.Metrics.push({ DisplayName: "New Metric", Measurement: "measurement" } as MetricConfig);
          setLConfig(curConfig);
        }
        }>Add</Button>
      </Box>
    </Stack>
    // </Grid>
  );
};

interface IMetricItemProps {
  metricConfig: MetricConfig;
  setMetricConfig: (m: MetricConfig, del?: boolean) => void;
}

const MetricItem = ({ metricConfig, setMetricConfig }: IMetricItemProps) => {
  return (
    <AccordionItem >
      <h2>
        <AccordionButton>
          <Box flex='1' textAlign='left'>
            {metricConfig.DisplayName}
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel>
        <Formik
          initialValues={metricConfig}
          onSubmit={(values) =>
            setMetricConfig(values)
          }
        >
          <Form autoComplete="off">
            <FormLabel>Display Name:</FormLabel>
            <Field name="DisplayName" placeholder="Display Name" as={Input} />
            <FormLabel pt={1}>Measurement:</FormLabel>
            <Field name="Measurement" placeholder="Measurement" as={Input} />
            <FormLabel pt={1}>Aggregation Function:</FormLabel>
            <Field name="AggFn" as={Select}>
              {Object.values(AggFn).map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}{" "}
            </Field>
            <Flex mt={3} justify="space-between" gap={2}>
              <HStack>
                <Button type="reset" colorScheme="gray">
                  Reset
                </Button>
                <Button type="submit" colorScheme="green">
                  Save
                </Button>
              </HStack>
              <Popover>
                {({ onClose }) => (
                  <>
                    <PopoverTrigger>
                      <Button colorScheme="red">Delete</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <PopoverArrow />
                      <PopoverCloseButton />
                      <PopoverHeader>Confirmation</PopoverHeader>
                      <PopoverBody>Are you sure you want to delete this metric configuration?</PopoverBody>
                      <PopoverFooter display='flex' justifyContent='flex-end'>
                        <ButtonGroup size='sm'>
                          <Button variant='outline' onClick={onClose}>Cancel</Button>
                          <Button colorScheme='red' onClick={() => setMetricConfig(metricConfig, true)}>Delete</Button>
                        </ButtonGroup>
                      </PopoverFooter>
                    </PopoverContent>
                  </>
                )}
              </Popover>
            </Flex>
          </Form>
        </Formik>
      </AccordionPanel>
    </AccordionItem>
  );
};

export default MetricsView;
