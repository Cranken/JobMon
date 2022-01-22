import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
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
  IconButton,
} from "@chakra-ui/react";
import { Dispatch, SetStateAction, useState } from "react";
import { SelectionMap } from "../../pages/job/[id]";

import style from "./JobFilter.module.css";
type SetFn = (val: SelectionMap) => void;

interface JobFilterProps {
  userName: [string, (value: string) => void];
  startTime: [Date, (value: Date) => void];
  stopTime: [Date, (value: Date) => void];
  numNodes: [number[], (value: number[]) => void];
  metrics: [SelectionMap, SetFn];
  partitions: [string[], string, (value: string) => void];
  numGpu: [number[], (value: number[]) => void];
  isRunning: [boolean, (value: boolean) => void];
  joblistLimit: [number, (value: number) => void];
  sortBy: [string, (value: string) => void];
  sortByDescending: [boolean, (value: boolean) => void];
}

export const JobFilter = ({
  userName,
  startTime,
  stopTime,
  numNodes,
  metrics,
  partitions,
  numGpu,
  isRunning,
  joblistLimit,
  sortBy,
  sortByDescending,
}: JobFilterProps) => {
  const timezoneOffsetMsec = new Date().getTimezoneOffset() * 60 * 1000;
  const getDateString = (d: Date) =>
    new Date(d.getTime() - timezoneOffsetMsec).toISOString().slice(0, 16);
  return (
    <Center>
      <Stack w="50%" borderWidth="1px" borderRadius="lg" padding={5} margin={4}>
        <Tabs>
          <TabList>
            <Tab>Job Data</Tab>
            <Tab>Time</Tab>
          </TabList>
          <TabPanels borderBottom="1px" borderColor="inherit">
            <TabPanel>
              <Stack>
                <Flex gap={3}>
                  <Input
                    value={userName[0]}
                    placeholder="User Id"
                    maxW="15ch"
                    onChange={(ev) => userName[1](ev.target.value)}
                  />
                  <Select
                    maxW="30ch"
                    value={partitions[1]}
                    onChange={(e) => partitions[2](e.target.value)}
                  >
                    <option value="">Show All Partitions</option>
                    {partitions[0].map((part) => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                  </Select>
                  <Select
                    maxW="30ch"
                    value={isRunning[0] ? "true" : "false"}
                    onChange={(e) => isRunning[1](e.target.value === "true")}
                  >
                    <option value="true">Show Running Jobs</option>
                    <option value="false">Hide Running Jobs</option>
                  </Select>
                </Flex>
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
                        max={224}
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
                        defaultValue={[0, 224]}
                        min={0}
                        max={224}
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
              <Stack>
                <Flex justify="center" align="center" h={10} w="fit-content">
                  <Text mr={2}>Filter start time between:</Text>
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
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Stack direction="row" justify="space-between">
          <Stack flexGrow={1} direction="row" align="center">
            <Text>Set limit of visible jobs per page:</Text>
            <Select
              value={joblistLimit[0]}
              onChange={(e) => joblistLimit[1](parseInt(e.target.value))}
              maxW="15ch"
            >
              <option value={0}>Show All</option>
              <option value={10}>Show 10</option>
              <option value={25}>Show 25</option>
              <option value={50}>Show 50</option>
            </Select>
          </Stack>
          <Stack flexGrow={1} direction="row" align="center" justify="end">
            <Text>Sort by:</Text>
            <Select
              value={sortBy[0]}
              onChange={(e) => sortBy[1](e.target.value)}
              maxW="25ch"
            >
              <option value={"joblength"}>Job Length</option>
              <option value={"StartTime"}>Start Time</option>
              <option value={"StopTime"}>Stop Time</option>
              <option value={"NumNodes"}>Number of Nodes</option>
              <option value={"Id"}>Job Id</option>
            </Select>
            <IconButton
              aria-label="sort-order"
              variant="ghost"
              onClick={() => sortByDescending[1](!sortByDescending[0])}
              icon={
                sortByDescending[0] ? (
                  <ChevronDownIcon boxSize={6} />
                ) : (
                  <ChevronUpIcon boxSize={6} />
                )
              }
            />
          </Stack>
        </Stack>
      </Stack>
    </Center>
  );
};

export default JobFilter;
