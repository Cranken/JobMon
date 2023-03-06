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
  FormControl,
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
  Tooltip,
  useToast,
  Wrap,
} from "@chakra-ui/react";
import { CreatableSelect } from "chakra-react-select";
import { Field, FieldHookConfig, Form, Formik, useField } from "formik";
import React, { useEffect, useState, useRef } from "react";
import { Configuration } from "../../types/config";
import { AggFn, MetricConfig } from "../../types/job";
import { NumberField, TextField } from "./FormComponents";

interface IMetricsViewProps {
  config: Configuration;
  setConfig: (c: Configuration) => void;
}



interface ICategoryPanelProps {
  availableCategories: string[];
  addCategory: (c: string) => void;
  removeCategory: (c: string) => void;
  currentCategory: string
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

const CategorySelect = ({ availableCategories, addCategory, currentCategory, ...props }: FieldHookConfig<string[]> & ICategoryPanelProps) => {
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




const TOOLTIP_TYPE = "Supported types: cpu, node, socket, accelerator.";
const TOOLTIP_UNIT = "Supported units: FLOP/s, Bit/s, °C, B/s, B, %, Packet/s, W, Reads, Writes, IOps, MetaOps. Default is none(empty string). \
                      Can be prefixed by SI-prefixes.";
const TOOLTIP_CATEGORIES = "Select metric categories the metric belongs to.";

const TOOLTIP_MAX_PER_NODES = "Maximum value a node can have for this metric. \
                               This value must be in the same unit as specified in the above unit field.";
const TOOLTIP_MAX_PER_TYPE = "Maximum value a unit as specified in the above \"Type\" field can have for this metric. \
                              This value must be in the same unit as specified in the above unit field.";

const TOOLTIP_SEPARATION_KEY = "Separation key used to differentiate between nodes in the InfluxDB query.";
const TOOLTIP_FILTER_FUNC = "Optional filter function used in InfluxDB queries. Must be a valid Flux query.";
const TOOLTIP_POST_QUERY_OP = "Optional post query function used in InfluxDB queries. Must be a valid Flux query.";



//////////////////////////////////////////////////////////////
///         NEW_MetricsView //////////////////////////////////
//////////////////////////////////////////////////////////////

const MetricsView = ({ config, setConfig }: IMetricsViewProps) => {
  const [lConfig, setLConfig] = useState(config);
  const [metricCategories, setMetricCategories] = useState(config.MetricCategories);
  const [metricsConfig, setMetricsConfig] = useState(config.Metrics);
  const newCategoryRef = useRef("");
  useEffect( () => {
    setLConfig(config);
  }, [config]);
  const toast = useToast();
  if (!lConfig) {
    return null;
  }

  return (
    <Stack gap={2}>
      {/* <StackDivider/> */}
      <Accordion allowMultiple>
        {
          metricCategories.map((category) => (
            <AccordionItem key={category}>
              <h2>
                <AccordionButton>
                  <Box flex='1' textAlign='left'>{category}</Box>
                <AccordionIcon/>
                </AccordionButton>
              </h2>
              <AccordionPanel>
                <Accordion allowMultiple>
                  {
                    // Only metrics belonging to the category c are shown.
                    metricsConfig.map((m, i) => (
                      (m.Categories.includes(category)) ? 
                      <>
                      <AccordionItem key={m.GUID}>
                        <h2>
                          <AccordionButton>
                            <Box flex='1' textAlign='left'>{m.DisplayName}</Box>
                            <AccordionIcon/>
                          </AccordionButton>
                        </h2>
                        <AccordionPanel>
                          <MetricForm
                            isNewMetric = {false}
                            metricConfig={m}
                            setMetricConfig={(m: MetricConfig, del = false) => {
                              let curMetricsConfig = metricsConfig;
                              
                              if (del) {
                                curMetricsConfig = curMetricsConfig.filter((_, ind) => ind != i);
                              } else {
                                curMetricsConfig[i] = m;
                              }
                              setMetricsConfig(curMetricsConfig);
                            }}
                            
                            availableCategories={metricCategories}
                            addCategory={(c) => {
                              let curMetricCategories = metricCategories;
                              curMetricCategories.push(c);
                              setMetricCategories(curMetricCategories)}}
                            removeCategory={(c) => {
                              let curMetricCategories = metricCategories;
                              curMetricCategories.push(c);
                              setMetricCategories(curMetricCategories)}}
                              currrentCategory={category}
                          />
                          
                        </AccordionPanel>
                      </AccordionItem>
                      </> : null
                    ))
                  }
                </Accordion>
                <HStack>
                <Popover>
                      {({ onClose }) => (
                        <>
                          <PopoverTrigger>
                            <Tooltip label={`Add a new metric!`}>
                              <Button colorScheme='blue'>+</Button>
                            </Tooltip>
                          </PopoverTrigger>
                          <PopoverContent>
                            <PopoverArrow/>
                            <PopoverCloseButton/>
                            <PopoverHeader>Confirmation</PopoverHeader>
                            <PopoverBody>
                            <MetricForm
                                metricConfig = {{
                                  Type: "node", Categories: [category],
                                  Measurement: "",
                                  AggFn: AggFn.Mean, SampleInterval: "",
                                  Unit: "", DisplayName: "New Metric",
                                  SeparationKey: "hostname",
                                  MaxPerNode: 0, MaxPerType: 0,
                                  PThreadAggFn: "",
                                  FilterFunc: "", PostQueryOp: "",
                                }}
                                setMetricConfig={(m: MetricConfig) => {
                                  const curMetricsConfig = {...metricsConfig};
                                  curMetricsConfig.push(m);
                                  setMetricsConfig(curMetricsConfig);
                                }}
                                availableCategories= {[category]}
                                addCategory={(c) => {setMetricCategories(mc => mc)}}
                                removeCategory={(c) => {setMetricCategories(mc => mc)}}
                            />

                            </PopoverBody>
                            <PopoverFooter/>
                          </PopoverContent>
                        
                        </>
                      )}
                    </Popover>
                  <Box>
                  <Tooltip label={`Delete category!!!`}>
                    <Button  colorScheme='red' onClick={() => {
                      
                      setMetricCategories(mc =>
                        metricCategories.filter(c => c != category)  
                      )
                    }}>X</Button>
                  </Tooltip>
                  </Box>
                </HStack>
              </AccordionPanel>
            </AccordionItem>
          ))
        }
      </Accordion>
          <Popover>
            {({ onClose }) => (
              <>
                <PopoverTrigger>
                  <Tooltip label={`Add a new category!`}>
                  <Button colorScheme='blue'>+</Button>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverArrow/>
                  <PopoverCloseButton/>
                  <PopoverHeader>Please enter the name of the new category!</PopoverHeader>
                  <PopoverBody/>
                  <PopoverFooter/>
                </PopoverContent>
              </>)}
          </Popover>
    </Stack>
  )
}

export default MetricsView;

interface IMetricsFormProps {
  isNewMetric: boolean,
  metricConfig: MetricConfig;
  setMetricConfig: (mC: MetricConfig, del?: boolean) => void;
}

const MetricForm = ({ isNewMetric, metricConfig, setMetricConfig, ...categories}: IMetricsFormProps & ICategoryPanelProps) => {
  return (
  <Formik
    initialValues={metricConfig}
    onSubmit={(values) => {
      values.MaxPerNode = Number(values.MaxPerNode);
      values.MaxPerType = Number(values.MaxPerType);
      setMetricConfig(values);
    }
    }
  >
    {({ values, errors}) => (
      <Form autoComplete="off">
        <FormLabel pt={1}>GUID: {values.GUID}</FormLabel>
        {TextField("Display Name", "DisplayName", errors.DisplayName)}
        {TextField("Measurement", "Measurement", errors.Measurement)}
        {TextField("Type", "Type", errors.Type, undefined, undefined, TOOLTIP_TYPE)}
        <>
          <FormLabel pt={1}>Categories</FormLabel>
          <Tooltip label={TOOLTIP_CATEGORIES}>
            <Box>
              <CategorySelect name="Categories" {...categories} />
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
        
        { // Popover should appear only if metric was already defined.
          <Popover>
            {({ onClose }) => (
            <>
            <PopoverTrigger>
              <Button colorScheme="red" isDisabled={isNewMetric}>Delete</Button>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>Confirmation</PopoverHeader>
              <PopoverBody>Are you sure you want to delete this metric configuration?</PopoverBody>
              <PopoverFooter display='flex' justifyContent='flex-end'>
                <ButtonGroup size='sm'>
                  <Button variant='outline' onClick={onClose}>Cancel</Button>
                  <Button colorScheme='red' onClick={() => {
                    let curMetricConfig = metricConfig;
                    // If the metric belongs to a single category it will be removed from the metric configuration.
                    if (curMetricConfig.Categories.includes(currentCategory) && curMetricConfig.Categories.length === 1){
                      setMetricConfig(metricConfig, del=true);
                      
                    } else {
                      // Delete a metric by removing the current category, this way the metric will not be deleted
                      // completely but it will be just removed from this category
                      removeCategory(currentCategory);
                    }
                    setMetricConfig(curMetricConfig)
                  }}>Delete</Button>
                </ButtonGroup>
              </PopoverFooter>
            </PopoverContent>
            </>)}
        </Popover>}
        </Flex>
      </Form>
    )}
  </Formik>
  )
}