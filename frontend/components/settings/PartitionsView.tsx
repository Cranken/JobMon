import { Stack, Accordion, Box, Button, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, ButtonGroup, Flex, HStack, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverFooter, PopoverHeader, PopoverTrigger, Wrap, FormLabel, Tooltip, Select } from "@chakra-ui/react";
import { Formik, Form, Field } from "formik";
import React, { useState } from "react";
import { Configuration } from "../../types/config";
import { MetricConfig, PartitionConfig as ParentPartitionConfig, VirtualPartitionConfig } from "../../types/job";
import { NumberField, TextField } from "./FormComponents";

/**
 * IPartitionsViewProps is an interface to store partition-configurations and a function to modify them.
 */
interface IPartitionsViewProps {
    config: Configuration;
    setConfig: (c: Configuration) => void;
}

/**
 * ExtendedConfig is an interface to store information around partitions.
 */
interface ExtendedConfig {
    displayName: string;
    availableMetrics: MetricConfig[];
    isVirtual: boolean;
    parent?: string;
    stringNodes?: string;
}

interface ExtendedPartitionConfig extends ExtendedConfig, ParentPartitionConfig { }
interface ExtendedVirtualPartitionConfig extends ExtendedConfig, VirtualPartitionConfig { }

type PartitionConfig = ExtendedPartitionConfig | ExtendedVirtualPartitionConfig;

/**
 * PartitionsView is a React Component providing settings for partitions.
 * PartitionsView displays all existing partitions.
 * The User is able to modify existing partitions, delete them and create new partitions.
 * @param config The current configuration
 * @param setConfig A function to set new configurations
 */
const PartitionsView = ({ config, setConfig }: IPartitionsViewProps) => {
    const [lConfig, setLConfig] = useState(config);
    const [accIndex, setAccIndex] = useState<number | undefined>(undefined);
    if (!lConfig) {
        return null;
    }
    /**
     * Creating an item for the given partition
     * @param pName The name of the partition
     * @param i The index identifying the menu for this partition
     * @param parent The parent of the partition if existent
     */
    const createPartitionItem = (pName: string, i: number, parent?: string) => {
        let partitionConfig: PartitionConfig;
        if (parent) {
            // Virtual config
            const p = lConfig.Partitions[parent];
            if (!(p.VirtualPartitions)) {
                p.VirtualPartitions = {};
            }
            partitionConfig = { ...p.VirtualPartitions[pName], displayName: pName, availableMetrics: lConfig.Metrics, isVirtual: !!parent, parent, stringNodes: p.VirtualPartitions[pName].Nodes?.join(",") ?? "" };
        } else {
            // Parent config
            partitionConfig = { ...lConfig.Partitions[pName], displayName: pName, availableMetrics: lConfig.Metrics, isVirtual: !!parent };
        }
        return (
            <PartitionItem
                // Hack to avoid duplicate keys if adding multiple new (empty) metrics
                key={pName + i + parent}
                partitionConfig={partitionConfig}
                setPartitionConfig={(pConf: PartitionConfig, del = false) => {
                    let index = accIndex;
                    const curConfig = { ...lConfig };
                    // Changed virtual state, delete previous entry
                    if (partitionConfig.isVirtual !== pConf.isVirtual) {
                        if (pConf.isVirtual) {
                            delete curConfig.Partitions[pName];
                        } else {
                            if (pConf.parent) {
                                const p = curConfig.Partitions[pConf.parent];
                                if (p.VirtualPartitions) {
                                    delete p.VirtualPartitions[pName];
                                }
                            }
                        }
                    }
                    if (pConf.isVirtual) {
                        if (pConf.parent) {
                            const p = curConfig.Partitions[pConf.parent];
                            if (del && p.VirtualPartitions) {
                                delete p.VirtualPartitions[pName];
                                index = undefined;
                            } else {
                                if (!(p.VirtualPartitions)) {
                                    p.VirtualPartitions = {};
                                }
                                if (pConf.displayName !== pName) {
                                    delete p.VirtualPartitions[pName];
                                    pName = pConf.displayName;
                                }
                                let Nodes = null;
                                if (pConf.stringNodes) {
                                    Nodes = pConf.stringNodes.split(",");
                                }
                                p.VirtualPartitions[pName] = { Nodes, Metrics: pConf.Metrics ?? null };
                                const pIndex = Object.keys(curConfig.Partitions).findIndex((v) => v === pConf.parent);
                                const vIndex = Object.keys(p.VirtualPartitions).findIndex((v) => v === pName);
                                index = pIndex + vIndex + 1;
                            }
                        }
                    } else {
                        if (del) {
                            delete curConfig.Partitions[pName];
                        } else {
                            if (pConf.displayName !== pName) {
                                delete curConfig.Partitions[pName];
                                pName = pConf.displayName;
                            }
                            let VirtualPartitions = null;
                            if ("VirtualPartitions" in pConf) {
                                VirtualPartitions = pConf.VirtualPartitions;
                            }
                            let MaxTime = 0;
                            if ("MaxTime" in pConf) {
                                MaxTime = pConf.MaxTime;
                            }
                            curConfig.Partitions[pName] = { MaxTime, Metrics: pConf.Metrics ?? null, VirtualPartitions };
                        }
                    }
                    setLConfig(curConfig);
                    setConfig(curConfig);
                    setAccIndex(index);
                }}
                parentPartitions={Object.keys(lConfig.Partitions)}
            />
        );
    };
    return (
        <Stack gap={2}>
            <Accordion allowToggle index={accIndex} onChange={(i) => {
                setAccIndex(i as number);
            }}>
                {Object.entries(lConfig.Partitions).map(([pName, p], i) => [createPartitionItem(pName, i)].concat(p.VirtualPartitions ? Object.entries(p.VirtualPartitions).map(([cName,], i) => createPartitionItem(cName, i, pName)) : []))}
            </Accordion>
            <Box>
                <Button onClick={() => {
                    const curConfig = { ...lConfig };
                    curConfig.Partitions["New Partition"] = {} as ParentPartitionConfig;
                    setLConfig(curConfig);
                }
                }>Add</Button>
            </Box>
        </Stack>
    );
};

/**
 * IPartitionItemProps is an interface for partition configurations.
 */
interface IPartitionItemProps {
    partitionConfig: PartitionConfig;
    setPartitionConfig: (m: PartitionConfig, del?: boolean) => void;
    parentPartitions: string[];
}

/**
 * PartitionItem is a React Component displaying the configuration of a particular partition.
 * @param partitionConfig The configuration.
 * @param setPartitionConfig A function to modify partitions.
 * @param parentPartitions The parents configuration.
 */
const PartitionItem = ({ partitionConfig, setPartitionConfig, parentPartitions }: IPartitionItemProps) => {
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
                    initialValues={{ ...partitionConfig, parent: partitionConfig.parent ?? (parentPartitions.length > 0 ? parentPartitions[0] : ""), stringNodes: partitionConfig.stringNodes ?? "" }}
                    onSubmit={(values) => {
                        if ("MaxTime" in values) {
                            values.MaxTime = Number(values.MaxTime);
                        }
                        setPartitionConfig(values);
                    }
                    }
                >
                    {({ values, errors }) => (
                        <Form autoComplete="off">
                            <FormLabel>
                                <Tooltip label={TOOLTIP_IS_VIRTUAL_PARTITION}>
                                    <Box maxW="fit-content">
                                        <Field type="checkbox" name="isVirtual" />
                                        Is Virtual Partition?
                                    </Box>
                                </Tooltip>
                            </FormLabel>
                            {TextField("Display Name", "displayName", errors.displayName)}
                            {values.isVirtual ?
                                <>
                                    <FormLabel pt={1}>Parent Partition</FormLabel>
                                    <Field name="parent" as={Select} >
                                        {parentPartitions.map((p) => {
                                            return p === partitionConfig.displayName ? null :
                                                (<option key={p} value={p}>
                                                    {p}
                                                </option>);
                                        }
                                        )}
                                    </Field>
                                </> : null}
                            {values.isVirtual ? null : NumberField("Max Wall Time (in seconds)", "MaxTime", "MaxTime" in errors ? errors.MaxTime : undefined)}
                            {values.isVirtual ?
                                TextField("Included Node Range", "stringNodes", errors.stringNodes, true, validateSlurmNodeRange)
                                : null}
                            <FormLabel pt={1}>Metrics</FormLabel>
                            <Wrap gap={5}>
                                {values.availableMetrics.map((m) =>
                                    <Tooltip label={m.GUID} key={m.GUID}>
                                        <FormLabel>
                                            <Field type="checkbox" name="Metrics" value={m.GUID} />
                                            {m.DisplayName}
                                        </FormLabel>
                                    </Tooltip>
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
        </AccordionItem >
    );
};

/**
 * Function to validate a given slurm-node-range
 * @param s The given range
 * @return True, if the range is valid, false otherwise
 */
const validateSlurmNodeRange = (s: string) => {
    // Can be better but good enough for frontend validation
    const match = s.match(/\w*\[{1}(?:\d|-|,)+\]{1}|^(?:\d|-|,)+$/);
    if (match && match.length === 1 && match[0] === s) {
        return "";
    }
    return "Not a valid node range format";
};

export default PartitionsView;

const TOOLTIP_IS_VIRTUAL_PARTITION = "Declares this partition as virtual. This is used in cases when there is a subgroup of nodes in a parent partition which have a different hardware configuration.";