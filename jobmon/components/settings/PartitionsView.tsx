import { Stack, Accordion, Box, Button, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, ButtonGroup, Flex, HStack, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverFooter, PopoverHeader, PopoverTrigger, Checkbox, Container, Wrap, Text, FormLabel } from "@chakra-ui/react";
import { Formik, Form, Field, FieldArray } from "formik";
import { useState } from "react";
import { Configuration } from "../../types/config";
import { AggFn, MetricConfig, PartitionConfig } from "../../types/job";
import { NumberField, TextField } from "./FormComponents";

interface IPartitionsViewProps {
    config: Configuration;
    setConfig: (c: Configuration) => void;
}

interface NamedPartitionConfig extends PartitionConfig {
    displayName: string;
    availableMetrics: MetricConfig[];
}

const PartitionsView = ({ config, setConfig }: IPartitionsViewProps) => {
    const [lConfig, setLConfig] = useState(config);
    if (!lConfig) {
        return null;
    }
    return (
        <Stack gap={2}>
            <Accordion allowMultiple>
                {Object.keys(lConfig.Partitions).map((pName, i) => (
                    <PartitionItem
                        // Hack to avoid duplicate keys if adding multiple new (empty) metrics
                        key={pName + i}
                        partitionConfig={{ ...lConfig.Partitions[pName], displayName: pName, availableMetrics: lConfig.Metrics }}
                        setPartitionConfig={(pConf: NamedPartitionConfig, del: boolean = false) => {
                            let curConfig = { ...lConfig };
                            if (del) {
                                delete curConfig.Partitions[pName];
                            } else {
                                if (pConf.displayName !== pName) {
                                    delete curConfig.Partitions[pName];
                                    pName = pConf.displayName;
                                }
                                curConfig.Partitions[pName] = { MaxTime: pConf.MaxTime, Metrics: pConf.Metrics ?? null };
                            }
                            setLConfig(curConfig);
                            setConfig(curConfig);
                        }} />
                ))}
            </Accordion>
            <Box>
                <Button onClick={() => {
                    let curConfig = { ...lConfig };
                    curConfig.Partitions["New Partition"] = {} as PartitionConfig;
                    setLConfig(curConfig);
                }
                }>Add</Button>
            </Box>
        </Stack>
    );
}

interface IPartitionItemProps {
    partitionConfig: NamedPartitionConfig;
    setPartitionConfig: (m: NamedPartitionConfig, del?: boolean) => void;
}

const PartitionItem = ({ partitionConfig, setPartitionConfig }: IPartitionItemProps) => {
    return (
        <AccordionItem >
            <h2>
                <AccordionButton>
                    <Box flex='1' textAlign='left'>
                        {partitionConfig.displayName}
                    </Box>
                    <AccordionIcon />
                </AccordionButton>
            </h2>
            <AccordionPanel>
                <Formik
                    initialValues={partitionConfig}
                    onSubmit={(values) => {
                        values.MaxTime = Number(values.MaxTime);
                        setPartitionConfig(values);
                    }
                    }
                >
                    {({ values, errors }) => (
                        <Form autoComplete="off">
                            {TextField("Display Name", "displayName", errors.displayName)}
                            {NumberField("Max Wall Time (in seconds)", "MaxTime", errors.MaxTime)}
                            <FormLabel pt={1}>Metrics</FormLabel>
                            <Wrap gap={5}>
                                {values.availableMetrics.map((m) =>
                                    <FormLabel key={m.Measurement}>
                                        <Field type="checkbox" name="Metrics" value={m.Measurement} />
                                        {m.DisplayName}
                                    </FormLabel>
                                )}
                            </Wrap>
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
                                                <PopoverBody>Are you sure you want to delete this partition configuration?</PopoverBody>
                                                <PopoverFooter display='flex' justifyContent='flex-end'>
                                                    <ButtonGroup size='sm'>
                                                        <Button variant='outline' onClick={onClose}>Cancel</Button>
                                                        <Button colorScheme='red' onClick={() => setPartitionConfig(partitionConfig, true)}>Delete</Button>
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
}

export default PartitionsView