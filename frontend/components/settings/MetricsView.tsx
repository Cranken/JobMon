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
  HStack,
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
  Tooltip,
  useToast,
  Wrap,
} from "@chakra-ui/react";
import { CreatableSelect } from "chakra-react-select";
import { Field, FieldHookConfig, Form, Formik, useField } from "formik";
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
  }, [config]);
  const toast = useToast();
  if (!lConfig) {
    return null;
  }
  return (
    <Stack gap={2}>
      {/* <CategoryPanel
        availableCategories={lConfig.MetricCategories}
        addCategory={(c) => {
          let curConfig = { ...lConfig };
          if (!(c in curConfig.MetricCategories)) {
            curConfig.MetricCategories.push(c);
            setLConfig(curConfig);
            setConfig(curConfig);
          }
        }}
        removeCategory={(c) => {
          let curConfig = { ...lConfig };
          curConfig.MetricCategories = curConfig.MetricCategories.filter((v) => v !== c);
          setLConfig(curConfig);
          setConfig(curConfig);
        }}
      /> */}
      {/* <StackDivider /> */}
      <Accordion allowMultiple>
        {lConfig.Metrics.map((m, i) => (
          <MetricItem
            // Hack to avoid duplicate keys if adding multiple new (empty) metrics
            key={m.GUID + i.toString()}
            metricConfig={m}
            setMetricConfig={(m: MetricConfig, del = false) => {
              const curConfig = { ...lConfig };
              if (!del && curConfig.Metrics[i].DisplayName === "New Metric") {
                toast({
                  description: "Remember to assign newly created metrics to partitions.",
                  status: "info",
                  isClosable: true
                });
              }
              if (del) {
                curConfig.Metrics = curConfig.Metrics.filter((_, ind) => ind != i);
              } else {
                curConfig.Metrics[i] = m;
              }
              setLConfig(curConfig);
              setConfig(curConfig);
            }}
            availableCategories={lConfig.MetricCategories}
            addCategory={(c) => {
              const curConfig = { ...lConfig };
              if (!(c in curConfig.MetricCategories)) {
                curConfig.MetricCategories.push(c);
                setLConfig(curConfig);
                setConfig(curConfig);
              }
            }}
            removeCategory={(c) => {
              const curConfig = { ...lConfig };
              curConfig.MetricCategories = curConfig.MetricCategories.filter((v) => v !== c);
              setLConfig(curConfig);
              setConfig(curConfig);
            }}
          />
        ))}
      </Accordion>
      <Box>
        <Button onClick={() => {
          const curConfig = { ...lConfig };
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

interface ICategoryPanelProps {
  availableCategories: string[];
  addCategory: (c: string) => void;
  removeCategory: (c: string) => void;
}


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
            </option>);
        }
        )}
      </Field>
    </>
  );
};

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
            </FormLabel>);
        }
        )}
      </Wrap>
    </>
  );
};

const CategorySelect = ({ availableCategories, addCategory, ...props }: FieldHookConfig<string[]> & ICategoryPanelProps) => {
  const [field, , helpers] = useField(props);
  return (
    <>
      <CreatableSelect
        isMulti
        value={field.value?.map((c) => ({ value: c, label: c })) ?? []}
        options={availableCategories.map((c) => ({ value: c, label: c }))}
        onChange={(c) => helpers.setValue(c.map((co) => co.value))}
        onCreateOption={(c) => {
          helpers.setValue([...(field.value ?? []), c]);
          addCategory(c);
        }}
      />
    </>
  );
};

const MetricItem = ({ metricConfig, setMetricConfig, ...category }: IMetricItemProps & ICategoryPanelProps) => {
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
            setMetricConfig(values);
          }
          }
        >
          {({ values, errors }) => (
            <Form autoComplete="off">
              <FormLabel pt={1}>GUID: {values.GUID}</FormLabel>
              {TextField("Display Name", "DisplayName", errors.DisplayName)}
              {TextField("Measurement", "Measurement", errors.Measurement)}
              {TextField("Type", "Type", errors.Type, undefined, undefined, TOOLTIP_TYPE)}
              <>
                <FormLabel pt={1}>Categories</FormLabel>
                <Tooltip label={TOOLTIP_CATEGORIES}>
                  <Box>
                    <CategorySelect name="Categories" {...category} />
                  </Box>
                </Tooltip>
              </>
              {values.Type === "cpu" ? AggFnSelection("PThread Aggregation Function", "PThreadAggFn", Object.values(AggFn)) : null}
              {TextField("Sample Interval", "SampleInterval", "", false)}
              {AvailableAggFns("Available Aggregation Functions")}
              {AggFnSelection("Default Aggregation Function", "AggFn", values.AvailableAggFns)}
              {TextField("Unit", "Unit", "", false, undefined, TOOLTIP_UNIT)}
              {NumberField("Max per Node", "MaxPerNode", errors.MaxPerNode, TOOLTIP_MAX_PER_NODES)}
              {NumberField("Max per Type", "MaxPerType", errors.MaxPerType, TOOLTIP_MAX_PER_TYPE)}
              {TextField("Separation Key", "SeparationKey", errors.SeparationKey, true, undefined, TOOLTIP_SEPARATION_KEY)}
              {TextField("Filter Function", "FilterFunc", "", false, undefined, TOOLTIP_FILTER_FUNC)}
              {TextField("Post Query Operation", "PostQueryOp", "", false, undefined, TOOLTIP_POST_QUERY_OP)}
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

const TOOLTIP_TYPE = "Supported types: cpu, node, socket, accelerator.";
const TOOLTIP_UNIT = "Supported units: FLOP/s, Bit/s, °C, B/s, B, %, Packet/s, W. Default is none(empty string). \
                      Can be prefixed by SI-prefixes.";
const TOOLTIP_CATEGORIES = "Select metric categories the metric belongs to.";

const TOOLTIP_MAX_PER_NODES = "Maximum value a node can have for this metric. \
                               This value must be in the same unit as specified in the above unit field.";
const TOOLTIP_MAX_PER_TYPE = "Maximum value a unit as specified in the above \"Type\" field can have for this metric. \
                              This value must be in the same unit as specified in the above unit field.";

const TOOLTIP_SEPARATION_KEY = "Separation key used to differentiate between nodes in the InfluxDB query.";
const TOOLTIP_FILTER_FUNC = "Optional filter function used in InfluxDB queries. Must be a valid Flux query.";
const TOOLTIP_POST_QUERY_OP = "Optional post query function used in InfluxDB queries. Must be a valid Flux query.";