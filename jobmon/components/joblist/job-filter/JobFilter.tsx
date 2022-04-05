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
  Select,
  IconButton,
} from "@chakra-ui/react";

import style from "./JobFilter.module.css";
import { Stepper } from "./Stepper";

interface JobFilterProps {
  userName: [string, (value: string) => void];
  startTime: [Date, (value: Date) => void];
  stopTime: [Date, (value: Date) => void];
  numNodes: [number[], (value: number[]) => void];
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
                  <Stepper
                    title="Number of Nodes"
                    minimum={1}
                    lowerLimit={numNodes[0][0]}
                    setLowerLimit={(val) => numNodes[1]([val, numNodes[0][1]])}
                    maximum={192}
                    upperLimit={numNodes[0][1]}
                    setUpperLimit={(val) => numNodes[1]([numNodes[0][0], val])}
                  ></Stepper>
                  <Stepper
                    title="Number of GPUs"
                    minimum={0}
                    lowerLimit={numGpu[0][0]}
                    setLowerLimit={(val) => numGpu[1]([val, numGpu[0][1]])}
                    maximum={224}
                    upperLimit={numGpu[0][1]}
                    setUpperLimit={(val) => numGpu[1]([numGpu[0][0], val])}
                  ></Stepper>
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
