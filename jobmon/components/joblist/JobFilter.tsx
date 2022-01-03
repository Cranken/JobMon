import {
  Flex,
  Input,
  Spacer,
  Text,
  Center,
  Button,
  TabList,
  Tab,
  Tabs,
  TabPanels,
  TabPanel,
  Stack,
  RangeSlider,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  RangeSliderTrack,
  Box,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Checkbox,
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionIcon,
  AccordionButton,
  Select,
  Container,
} from "@chakra-ui/react";
import { Dispatch, SetStateAction, useState } from "react";
import { SelectionMap } from "../../pages/job/[id]";

import style from "./JobFilter.module.css";
type SetFn = (val: SelectionMap) => void;

interface JobFilterProps {
  userId: [string, Dispatch<SetStateAction<string>>];
  startTime: [Date, Dispatch<SetStateAction<Date>>];
  stopTime: [Date, Dispatch<SetStateAction<Date>>];
  numNodes: [number[], Dispatch<SetStateAction<number[]>>];
  metrics: [SelectionMap, SetFn];
  partitions: [string[], string, Dispatch<SetStateAction<string>>];
  numGpu: [number[], Dispatch<SetStateAction<number[]>>];
}

export const JobFilter = ({
  userId,
  startTime,
  stopTime,
  numNodes,
  metrics,
  partitions,
  numGpu,
}: JobFilterProps) => {
  const timezoneOffsetMsec = new Date().getTimezoneOffset() * 60 * 1000;
  const getDateString = (d: Date) =>
    new Date(d.getTime() - timezoneOffsetMsec).toISOString().slice(0, 16);
  return (
    <Center>
      <Flex
        w="50%"
        borderWidth="1px"
        borderRadius="lg"
        padding="3ch"
        margin="2ch"
        minHeight="22vh"
      >
        <Tabs w="100%">
          <TabList>
            <Tab>Job Data</Tab>
            <Tab>Time</Tab>
            <Tab>Settings</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Stack>
                <Input
                  value={userId[0]}
                  placeholder="User Id"
                  maxW="15ch"
                  mr={5}
                  onChange={(ev) => userId[1](ev.target.value)}
                />
                <Select
                  maxW="30ch"
                  value={partitions[1]}
                  onChange={(e) => partitions[2](e.target.value)}
                >
                  <option value="">All partitions</option>
                  {partitions[0].map((part) => (
                    <option key={part} value={part}>
                      {part}
                    </option>
                  ))}
                </Select>
                <Stack direction="row" gap={6}>
                  <Box flexGrow={1}>
                    <Flex justify="space-between" align="center">
                      <NumberInput
                        maxW="10ch"
                        value={numNodes[0][0]}
                        min={1}
                        max={numNodes[0][1]}
                        onChange={(_, val) =>
                          numNodes[1]([val, numNodes[0][1]])
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text>Number of Nodes</Text>
                      <NumberInput
                        maxW="10ch"
                        value={numNodes[0][1]}
                        min={numNodes[0][0]}
                        max={192}
                        onChange={(_, val) =>
                          numNodes[1]([numNodes[0][0], val])
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Flex>
                    <Box w="100%">
                      <RangeSlider
                        defaultValue={[0, 192]}
                        min={1}
                        max={192}
                        value={numNodes[0]}
                        onChange={(val) => numNodes[1](val)}
                      >
                        <RangeSliderTrack>
                          <RangeSliderFilledTrack />
                        </RangeSliderTrack>
                        <RangeSliderThumb index={0} />
                        <RangeSliderThumb index={1} />
                      </RangeSlider>
                    </Box>
                  </Box>
                  <Box flexGrow={1}>
                    <Flex justify="space-between" align="center">
                      <NumberInput
                        maxW="10ch"
                        value={numGpu[0][0]}
                        min={0}
                        max={numGpu[0][1]}
                        onChange={(_, val) => numGpu[1]([val, numGpu[0][1]])}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text>Number of GPUs</Text>
                      <NumberInput
                        maxW="10ch"
                        value={numGpu[0][1]}
                        min={numGpu[0][0]}
                        max={128}
                        onChange={(_, val) => numGpu[1]([numGpu[0][0], val])}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Flex>
                    <Box w="100%">
                      <RangeSlider
                        defaultValue={[0, 192]}
                        min={0}
                        max={128}
                        value={numGpu[0]}
                        onChange={(val) => numGpu[1](val)}
                      >
                        <RangeSliderTrack>
                          <RangeSliderFilledTrack />
                        </RangeSliderTrack>
                        <RangeSliderThumb index={0} />
                        <RangeSliderThumb index={1} />
                      </RangeSlider>
                    </Box>
                  </Box>
                </Stack>
              </Stack>
            </TabPanel>
            <TabPanel>
              <Flex
                justify="center"
                align="center"
                borderWidth="1px"
                borderRadius="lg"
                h={10}
                px={2}
                w="fit-content"
              >
                <Text mr={2}>Filter between:</Text>
                <input
                  className={style["time-input"]}
                  type="datetime-local"
                  min="2021-10-01T00:00"
                  value={getDateString(startTime[0])}
                  onChange={(ev) => startTime[1](new Date(ev.target.value))}
                />
                <Spacer mx={1} />
                <Text mr={2}>and:</Text>
                <input
                  className={style["time-input"]}
                  type="datetime-local"
                  min="2021-10-01T00:00"
                  value={getDateString(stopTime[0])}
                  onChange={(ev) => stopTime[1](new Date(ev.target.value))}
                />
                <Spacer mx={1} />
                <Button
                  size="sm"
                  onClick={() => {
                    startTime[1](new Date("2021-10-01"));
                    stopTime[1](new Date());
                  }}
                >
                  Reset
                </Button>
              </Flex>
            </TabPanel>
            <TabPanel>
              <Accordion allowToggle>
                <AccordionItem>
                  <h2>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        Select metrics shown in histograms
                      </Box>
                    </AccordionButton>
                  </h2>
                  <AccordionPanel>
                    <Stack>
                      {Object.keys(metrics[0]).map((val) => (
                        <Checkbox
                          key={val}
                          isChecked={metrics[0][val]}
                          onChange={(e) =>
                            metrics[1]({ [val]: e.target.checked })
                          }
                        >
                          {val}
                        </Checkbox>
                      ))}
                    </Stack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
    </Center>
  );
};

export default JobFilter;
