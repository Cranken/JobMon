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
  Divider,
} from "@chakra-ui/react";
import { JobSearchParams } from "../../../types/job";
import { dateToUnix } from "../../../utils/utils";

import style from "./JobFilter.module.css";
import { Stepper } from "./Stepper";
import { useEffect, useState } from "react";

interface JobFilterProps {
  params: JobSearchParams;
  setParams: (p: JobSearchParams) => void;
  partitions: string[];
  tabTitles?: JSX.Element[];
  tabPanels?: JSX.Element[];
  mustApply?: boolean;
}

export const JobFilter = ({
  params,
  setParams,
  partitions,
  tabTitles,
  tabPanels,
  mustApply = false,
}: JobFilterProps) => {
  const [filterParams, setFilterParams] = useState(params);
  const [shouldApply, setShouldApply] = useState(false);
  useEffect(() => {
    setFilterParams(params);
  }, [params]);
  useEffect(() => {
    if (mustApply && shouldApply) {
      setParams(filterParams);
      setShouldApply(false);
    }
    if (!mustApply) {
      setParams(filterParams);
    }
  }, [params, filterParams, shouldApply, mustApply, setParams]);
  const timezoneOffset = new Date().getTimezoneOffset() * 60;
  const getDateString = (d: number) =>
    new Date(d - timezoneOffset).toISOString().slice(0, 16);
  return (
    <Stack>
      <Tabs>
        <TabList>
          <Tab>Job Data</Tab>
          <Tab>Time</Tab>
          {tabTitles}
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack>
              <Flex gap={3}>
                <Input
                  value={filterParams.UserName}
                  placeholder="User Id"
                  maxW="15ch"
                  onChange={(ev) =>
                    setFilterParams({ ...params, UserName: ev.target.value })
                  }
                />
                <Select
                  maxW="30ch"
                  value={filterParams.Partition}
                  onChange={(e) =>
                    setFilterParams({ ...params, Partition: e.target.value })
                  }
                >
                  <option value="">Show All Partitions</option>
                  {partitions.map((part) => (
                    <option key={part} value={part}>
                      {part}
                    </option>
                  ))}
                </Select>
                <Select
                  maxW="30ch"
                  value={filterParams.IsRunning ? "true" : "false"}
                  onChange={(e) =>
                    setFilterParams({
                      ...filterParams,
                      IsRunning: e.target.value === "true",
                    })
                  }
                >
                  <option value="true">Show Running Jobs</option>
                  <option value="false">Hide Running Jobs</option>
                </Select>
              </Flex>
              <Stack direction="row" gap={6}>
                <Stepper
                  title="Number of Nodes"
                  minimum={1}
                  lowerLimit={filterParams.NumNodes?.[0] ?? 1}
                  setLowerLimit={(val) =>
                    setFilterParams({
                      ...filterParams,
                      NumNodes: [val, filterParams.NumNodes?.[1]],
                    })
                  }
                  maximum={192}
                  upperLimit={filterParams.NumNodes?.[1] ?? 1}
                  setUpperLimit={(val) =>
                    setFilterParams({
                      ...filterParams,
                      NumNodes: [filterParams.NumNodes?.[0], val],
                    })
                  }
                ></Stepper>
                <Stepper
                  title="Number of GPUs"
                  minimum={0}
                  lowerLimit={filterParams.NumGpus?.[0] ?? 1}
                  setLowerLimit={(val) =>
                    setFilterParams({
                      ...filterParams,
                      NumGpus: [val, filterParams.NumGpus?.[1]],
                    })
                  }
                  maximum={224}
                  upperLimit={filterParams.NumGpus?.[1] ?? 1}
                  setUpperLimit={(val) =>
                    setFilterParams({
                      ...filterParams,
                      NumGpus: [filterParams.NumGpus?.[0], val],
                    })
                  }
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
                  value={getDateString((filterParams.Time?.[0] ?? 0) * 1000)}
                  onChange={(ev) =>
                    setFilterParams({
                      ...filterParams,
                      Time: [
                        dateToUnix(new Date(ev.target.value)),
                        filterParams.Time?.[1],
                      ],
                    })
                  }
                />
                <Spacer mx={1} />
                <Text mr={2}>and:</Text>
                <input
                  className={style["time-input"]}
                  type="datetime-local"
                  min="2021-10-01T00:00"
                  value={getDateString((filterParams.Time?.[1] ?? 0) * 1000)}
                  onChange={(ev) =>
                    setFilterParams({
                      ...filterParams,
                      Time: [
                        filterParams.Time?.[0],
                        dateToUnix(new Date(ev.target.value)),
                      ],
                    })
                  }
                />
                <Spacer mx={1} />
                <Button
                  size="sm"
                  onClick={() =>
                    setFilterParams({
                      ...filterParams,
                      Time: [
                        dateToUnix(
                          new Date(
                            Math.floor(Date.now()) - 60 * 60 * 24 * 14 * 1000
                          )
                        ),
                        dateToUnix(new Date()),
                      ],
                    })
                  }
                >
                  Reset
                </Button>
              </Flex>
            </Stack>
          </TabPanel>
          {tabPanels}
        </TabPanels>
      </Tabs>
      {mustApply ? (
        <>
          <Divider></Divider>
          <Flex dir="row" justify="end">
            <Button onClick={() => setShouldApply(true)}>Apply</Button>
          </Flex>
        </>
      ) : null}
    </Stack>
  );
};

export default JobFilter;
