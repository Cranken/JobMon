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
} from "@chakra-ui/react";
import { Dispatch, SetStateAction, useState } from "react";

import style from "./JobFilter.module.css";

interface JobFilterProps {
  userId: [string, Dispatch<SetStateAction<string>>];
  startTime: [Date, Dispatch<SetStateAction<Date>>];
  stopTime: [Date, Dispatch<SetStateAction<Date>>];
  numNodes: [number[], Dispatch<SetStateAction<number[]>>];
}

export const JobFilter = ({
  userId,
  startTime,
  stopTime,
  numNodes,
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
      >
        <Tabs w="100%">
          <TabList>
            <Tab>Job Data</Tab>
            <Tab>Time</Tab>
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
                <Box>
                  <Flex justify="space-between" align="center">
                    <NumberInput
                      maxW="10ch"
                      value={numNodes[0][0]}
                      min={1}
                      max={numNodes[0][1]}
                      onChange={(_, val) => numNodes[1]([val, numNodes[0][1]])}
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
                      onChange={(_, val) => numNodes[1]([numNodes[0][0], val])}
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
          </TabPanels>
        </Tabs>
      </Flex>
    </Center>
  );
};

export default JobFilter;
