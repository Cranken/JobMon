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
  Text,
  Tooltip,
  useToast,
  Wrap,
} from "@chakra-ui/react";
import { CreatableSelect } from "chakra-react-select";
import { Field, FieldHookConfig, Form, Formik, useField } from "formik";
import React, { useState} from "react";
import { Configuration } from "../../types/config";
import { AggFn, MetricConfig } from "../../types/job";
import { NumberField, TextField} from "./FormComponents";
import { CheckCircleIcon, AddIcon, CheckIcon, DeleteIcon } from "@chakra-ui/icons";

/**
 * Properties for the {@link MetricsView} component
 */
interface IMetricsViewProps {
  config: Configuration;
  setConfig: (c: Configuration) => void;
}


interface ICategoryPanelProps {
  availableCategories: string[];
  addCategory: (c: string) => void;
  removeCategoryFromMetric: (m: MetricConfig, c: string) => void;
  currentCategory: string
}

interface INewCategoryInputProps {
  onClose: () => void
  addCategory: (c: string) => void
}

/**
 * IMetricsFormProps is an interface that describes the props that are passed as arguments 
 * to the MetricFrom component.   
*/
interface IMetricsFormProps {
  isNewMetric: boolean, 
  metricConfig: MetricConfig;
  setMetricConfig: (mC: MetricConfig, del?: boolean) => void;
}

/**
 * MetricsView contains the frontend logic of the `Metrics` settings, the metrics are listed
 * based on categories as Accordions, then each Accordion contains another Accordion of metrics.
 * A metric can belong to multiple categories. Each time a new category or metric is added only 
 * the state is updated. To permanently save the new configuration the user needs to save 
 * the new configuration manually.
 * @param config - current configuration
 * @param setConfig - function for updating the configuration passed as a prop.
 * @returns the MetricsWiew component
 */
const MetricsView = ({ config, setConfig }: IMetricsViewProps) => {
  // State for storing the local configuration.
  const [lConfig, setLConfig] = useState(config);

  const addCategory = (c: string) => {
    const curConfig = {...lConfig};
    curConfig.MetricCategories.push(c);
    setLConfig(curConfig)
  }

  const removeCategory = (c: string) => {
    const curConfig = {...lConfig};
    curConfig.MetricCategories = curConfig.MetricCategories.filter(c1 => c1 != c);
    setLConfig(curConfig)
  }


  const removeCategoryFromMetric = (m: MetricConfig, c: string) => {
    const curConfig = {...lConfig};
    const indexOfMetric = curConfig.Metrics.indexOf(m);
    if (indexOfMetric === -1) {
      // Couldn't find the index of the metric.
      return
    } else {
      // Filter out the category from the list of categories for a given metric.
      curConfig.Metrics[indexOfMetric].Categories = curConfig.Metrics[indexOfMetric].Categories.filter(c1 => c1 != c);
      setLConfig(curConfig);
    }

  }

  const toast = useToast();
  
  return (
    <Stack gap={2} w={{base: "97%", lg: ""}}>
      {/* <StackDivider/> */}
      <Accordion allowMultiple>
        {
          lConfig.MetricCategories.map((category) => (
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
                    // Only metrics belonging to the given category c are shown.
                    lConfig.Metrics.map((m, i) => (
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
                            key={m.GUID+1}
                            isNewMetric = {false}
                            metricConfig={m}
                            setMetricConfig={(m: MetricConfig, del?: boolean) => {
                              const curConfig = {...lConfig};
                              if (del) {
                                curConfig.Metrics = curConfig.Metrics.filter((_, ind) => ind != i);
                              } else {
                                curConfig.Metrics[i] = m;
                              }
                              setLConfig(curConfig)
                            }}
                            
                            availableCategories={lConfig.MetricCategories}
                            addCategory={addCategory}
                            removeCategoryFromMetric={removeCategoryFromMetric}
                            currentCategory={category}
                          />
                          
                        </AccordionPanel>
                      </AccordionItem>
                      </> : null
                    ))
                  }
                </Accordion>
                <HStack>
                <Popover placement="left-start">
                      {({ onClose }) => (
                        <>
                          <PopoverTrigger>
                              <Button colorScheme='blue'><AddIcon/></Button>
                          </PopoverTrigger>
                              <PopoverContent>
                                <PopoverArrow/>
                                <PopoverCloseButton/>
                                <PopoverHeader>Confirmation</PopoverHeader>
                                <PopoverBody>
                                <MetricForm
                                    isNewMetric={true}
                                    metricConfig = {{
                                      GUID: "",
                                      Type: "node", 
                                      Categories: [category],
                                      Measurement: "",
                                      AggFn: AggFn.Mean, 
                                      AvailableAggFns: [],
                                      SampleInterval: "",
                                      Unit: "", 
                                      DisplayName: "New Metric",
                                      SeparationKey: "hostname",
                                      MaxPerNode: 0, 
                                      MaxPerType: 0,
                                      PThreadAggFn: AggFn.Mean,
                                      FilterFunc: "", 
                                      PostQueryOp: "",
                                    }}
                                    setMetricConfig={(m: MetricConfig) => {
                                      const curConfig = {...lConfig};
                                      curConfig.Metrics.push(m);
                                      setLConfig(curConfig);
                                      setConfig(curConfig);
                                      onClose()
                                    }}
                                    availableCategories= {[category]}
                                    addCategory={addCategory}
                                    removeCategoryFromMetric={removeCategoryFromMetric}
                                    currentCategory={category}
                                />
                                </PopoverBody>
                                <PopoverFooter/>
                              </PopoverContent>
                            
                        </>
                      )}
                    </Popover>
                  <Popover>
                    {({ onClose }) => 
                    <>
                      <PopoverTrigger>
                        <Button 
                            colorScheme='red' 
                            >
                            <DeleteIcon/>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <PopoverArrow/>
                        <PopoverCloseButton />
                        <PopoverHeader>Confirmation</PopoverHeader>
                        <PopoverBody>{`Are you sure you want to delete "${category}"`}</PopoverBody>
                        <PopoverFooter display='flex' justifyContent='flex-end'>
                            <ButtonGroup size='sm'>
                              <Button variant='outline' onClick={onClose}>Cancel</Button>
                              <Button colorScheme='red' onClick={() => 
                                {{removeCategory(category)}}}
                              >Yes</Button>
                            </ButtonGroup>
                        </PopoverFooter>
                      </PopoverContent>
                    </>
                    }
                  </Popover>
                </HStack>
              </AccordionPanel>
            </AccordionItem>
          ))
        }
        
      </Accordion>
      <HStack>
          <Flex>
          <Popover>
            {({ onClose }) => (
              <>
                <PopoverTrigger>
                  <Button colorScheme='blue'><AddIcon/></Button>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverArrow/>
                  <PopoverCloseButton/>
                  <PopoverHeader/>
                  <PopoverBody>
                    <NewCategoryInput 
                      onClose={onClose}
                      addCategory={addCategory} />
                  </PopoverBody>
                  <PopoverFooter/>
                </PopoverContent>
              </>)}
          </Popover>
          </Flex>
          <Tooltip label={"Save the current configuration"}>
            <Button colorScheme='green' onClick={() => {
                toast({
                  description: "Remember to assign newly created metrics to partitions.",
                  status: "info",
                  isClosable: true
                });
                setConfig(lConfig)
              }
            }><CheckCircleIcon/></Button>
          </Tooltip>
          
        </HStack>
    </Stack>
  )
}

export default MetricsView;



/**
 * MetricForm is a React component that contains the logic of a metric form, this component is used
 * either for rendering the current configuration of a metric, or inserting a new metric.
 * @param isNewMetric - a boolean used for checking the delete button should be rendered or not.
 * @param metriConfig - current metrics configuration
 * @param setMetricConfig - set function for the metricConfig state. 
 * @returns a form component 
 */
const MetricForm = ({ isNewMetric, metricConfig, setMetricConfig, ...categories}: IMetricsFormProps & ICategoryPanelProps) => {
  const currentCategory = categories.currentCategory;
  const removeCategoryFromMetric = categories.removeCategoryFromMetric;
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
        {
          // Show the Reset and Submit buttons only if a metric configuration is being inserted.
          isNewMetric ? 
          <HStack>
            <Button type="reset" colorScheme="gray">
              Reset
            </Button> : null
            <Button type="submit" colorScheme="green" isDisabled={!isNewMetric}>
              Save
            </Button>
          </HStack> : null
        }        
        
        { // This popover should appear only if metric was already defined.
          !isNewMetric ?
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
                  <Button colorScheme='red' onClick={() => {
                    const curMetricConfig = metricConfig;
                    // If the metric belongs to a single category it will be removed from the metric configuration.
                    if (curMetricConfig.Categories.includes(currentCategory) && curMetricConfig.Categories.length === 1){
                      setMetricConfig(metricConfig, true);
                    } else {
                      // Delete a metric by removing the current category, this way the metric will not be deleted
                      // completely but it will be just removed from the current category.
                      removeCategoryFromMetric(metricConfig, currentCategory);
                    }
                    setMetricConfig(curMetricConfig)
                  }}>Delete</Button>
                </ButtonGroup>
              </PopoverFooter>
            </PopoverContent>
            </>)}
        </Popover> : null}
        </Flex>
      </Form>
    )}
  </Formik>
  )
}

/**
 * NewCategoryInput returns a component that is used for inserting a new category.
 * This component was added due to performance issues when the state that stores the input
 * was updated on each key press. This triggered a rerender of the entire metricsView component.
 * @param onClose - props passed by the parent component for closing the input popover.
 * @param addCategory - prop passed from the parent component for inserting a new category.
 * @returns an input component used for inserting a new category.
 */



const NewCategoryInput = ({ onClose, addCategory }: INewCategoryInputProps ) => {
  const [name, setName] = useState("New category");
  return (
    <>
    <Text>Name:</Text>
    
    <Input 
      value={name}
      placeholder='New category'
      onChange={(e) => {
        setName(e.target.value)
      }}
      // Submit the input if Enter key was pressed.
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          addCategory(name);
          onClose()
        }
      }}
    />
    <Button onClick={() => {
      addCategory(name);
      onClose()
      }}>
      <CheckIcon/>
    </Button>
    </>
    
  )
}


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

// const StringFromStringList = <T,>(displayName: string, key: keyof T, stringList: string[], validate = true, tooltip?: string) => {
  
//   const validationFunc = (s: string) => {
//     const subMeasurements = s.split(',');
//     const validCondition = subMeasurements.length != 0 || s === "";
//     return validCondition
//   }  
//   let joinedString = stringList.join(',')
//   return (
//     <>
//       <FormLabel pt={1}>{displayName}</FormLabel>
//       <Tooltip label={tooltip}>
//         <Box>
//           <Field name={key} placeholder={displayName} value={joinedString} as={Input} validate={validate ? (validationFunc ?? validateNotEmpty) : undefined}/>
//         </Box>
//       </Tooltip>
//     </>
//   )
// }

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
