import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormLabel,
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
  useToast,
  Wrap,
} from "@chakra-ui/react";
import { Field, Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import { Configuration } from "../../types/config";
import { AggFn, MetricConfig } from "../../types/job";
import { NumberField, TextField } from "./FormComponents";

interface IMetricsViewProps {
  config: Configuration;
  setConfig: (c: Configuration) => void;
}

const MetricsView = ({ config, setConfig }: IMetricsViewProps) => {
  const [lConfig, setLConfig] = useState(config);
  useEffect(() => {
    setLConfig(config);
  }, [config])
  const toast = useToast();
  if (!lConfig) {
    return null;
  }
  return (
    <Stack gap={2}>
      <Accordion allowMultiple>
        {lConfig.Metrics.map((m, i) => (
          <MetricItem
            // Hack to avoid duplicate keys if adding multiple new (empty) metrics
            key={m.GUID + i.toString()}
            metricConfig={m}
            setMetricConfig={(m: MetricConfig, del: boolean = false) => {
              let curConfig = { ...lConfig };
              if (!del && curConfig.Metrics[i].DisplayName === "New Metric") {
                toast({
                  description: "Remember to assign newly created metrics to partitions.",
                  status: "info",
                  isClosable: true
                })
              }
              if (del) {
                curConfig.Metrics = curConfig.Metrics.filter((_, ind) => ind != i)
              } else {
                curConfig.Metrics[i] = m;
              }
              setLConfig(curConfig);
              setConfig(curConfig);
            }} />
        ))}
      </Accordion>
      <Box>
        <Button onClick={() => {
          let curConfig = { ...lConfig };
          curConfig.Metrics.push({
            Type: "node", Measurement: "",
            AggFn: AggFn.Mean, SampleInterval: "",
            Unit: "", DisplayName: "New Metric",
            SeparationKey: "hostname",
            MaxPerNode: 0, MaxPerType: 0,
            PThreadAggFn: "",
            FilterFunc: "", PostQueryOp: "",
          } as MetricConfig);
          setLConfig(curConfig);
        }
        }>Add</Button>
      </Box>
    </Stack>
  );
};

interface IMetricItemProps {
  metricConfig: MetricConfig;
  setMetricConfig: (m: MetricConfig, del?: boolean) => void;
}

const AggFnSelection = (displayName: string, name: string, availableAggFns: string[]) => {
  if ((availableAggFns?.length ?? 0) === 0) {
    return null;
  }
  return (
    <>
      <FormLabel pt={1}>{displayName}</FormLabel>
      <Field name={name} as={Select} >
        {availableAggFns.map((fn) => {
          return fn === AggFn.Empty ? null :
            (<option key={fn} value={fn}>
              {fn}
            </option>)
        }
        )}
      </Field>
    </>
  )
}

const AvailableAggFns = (displayName: string) => {
  return (
    <>
      <FormLabel pt={1}>{displayName}</FormLabel>
      <Wrap gap={5}>
        {Object.values(AggFn).map((fn) => {
          return fn === AggFn.Empty ? null :
            (<FormLabel key={fn}>
              <Field type="checkbox" name="AvailableAggFns" value={fn} />
              {fn}
            </FormLabel>)
        }
        )}
      </Wrap>
    </>
  )
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
          onSubmit={(values) => {
            values.MaxPerNode = Number(values.MaxPerNode);
            values.MaxPerType = Number(values.MaxPerType);
            setMetricConfig(values)
          }
          }
        >
          {({ values, errors }) => (
            <Form autoComplete="off">
              <FormLabel pt={1}>GUID: {values.GUID}</FormLabel>
              {TextField("Display Name", "DisplayName", errors.DisplayName)}
              {TextField("Measurement", "Measurement", errors.Measurement)}
              {TextField("Type", "Type", errors.Type)}
              {values.Type === "cpu" ? AggFnSelection("PThread Aggregation Function", "PThreadAggFn", Object.values(AggFn)) : null}
              {TextField("Sample Interval", "SampleInterval", "", false)}
              {AvailableAggFns("Available Aggregation Functions")}
              {AggFnSelection("Default Aggregation Function", "AggFn", values.AvailableAggFns)}
              {TextField("Unit", "Unit", "", false)}
              {NumberField("Max per Node", "MaxPerNode", errors.MaxPerNode)}
              {NumberField("Max per Type", "MaxPerType", errors.MaxPerType)}
              {TextField("Separation Key", "SeparationKey", errors.SeparationKey)}
              {TextField("Filter Function", "FilterFunc", "", false)}
              {TextField("Post Query Operation", "PostQueryOp", "", false)}
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
          )}
        </Formik>
      </AccordionPanel>
    </AccordionItem>
  );
};

export default MetricsView;
