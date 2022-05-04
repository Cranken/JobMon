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
import { JobSearchParams } from "../../../types/job";
import { dateToUnix } from "../../../utils/utils";

import style from "./JobFilter.module.css";
import { Stepper } from "./Stepper";

interface JobFilterProps {
  params: JobSearchParams;
  setParams: (p: JobSearchParams) => void;
  partitions: string[];
}

export const JobFilter = ({
  params,
  setParams,
  partitions,
}: JobFilterProps) => {
  const timezoneOffset = new Date().getTimezoneOffset() * 60;
  const getDateString = (d: number) =>
    new Date(d - timezoneOffset).toISOString().slice(0, 16);
  return (
    <Stack>
      <Tabs>
        <TabList>
          <Tab>Job Data</Tab>
          <Tab>Time</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack>
              <Flex gap={3}>
                <Input
                  value={params.UserName}
                  placeholder="User Id"
                  maxW="15ch"
                  onChange={(ev) =>
                    setParams({ ...params, UserName: ev.target.value })
                  }
                />
                <Select
                  maxW="30ch"
                  value={params.Partition}
                  onChange={(e) =>
                    setParams({ ...params, Partition: e.target.value })
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
                  value={params.IsRunning ? "true" : "false"}
                  onChange={(e) =>
                    setParams({
                      ...params,
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
                  lowerLimit={params.NumNodes?.[0] ?? 1}
                  setLowerLimit={(val) =>
                    setParams({
                      ...params,
                      NumNodes: [val, params.NumNodes?.[1]],
                    })
                  }
                  maximum={192}
                  upperLimit={params.NumNodes?.[1] ?? 1}
                  setUpperLimit={(val) =>
                    setParams({
                      ...params,
                      NumNodes: [params.NumNodes?.[0], val],
                    })
                  }
                ></Stepper>
                <Stepper
                  title="Number of GPUs"
                  minimum={0}
                  lowerLimit={params.NumGpus?.[0] ?? 1}
                  setLowerLimit={(val) =>
                    setParams({
                      ...params,
                      NumGpus: [val, params.NumGpus?.[1]],
                    })
                  }
                  maximum={224}
                  upperLimit={params.NumGpus?.[1] ?? 1}
                  setUpperLimit={(val) =>
                    setParams({
                      ...params,
                      NumGpus: [params.NumGpus?.[0], val],
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
                  value={getDateString((params.Time?.[0] ?? 0) * 1000)}
                  onChange={(ev) =>
                    setParams({
                      ...params,
                      Time: [
                        dateToUnix(new Date(ev.target.value)),
                        params.Time?.[1],
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
                  value={getDateString((params.Time?.[1] ?? 0) * 1000)}
                  onChange={(ev) =>
                    setParams({
                      ...params,
                      Time: [
                        params.Time?.[0],
                        dateToUnix(new Date(ev.target.value)),
                      ],
                    })
                  }
                />
                <Spacer mx={1} />
                <Button
                  size="sm"
                  onClick={() =>
                    setParams({
                      ...params,
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
        </TabPanels>
      </Tabs>
    </Stack>
  );
};

export default JobFilter;
