import {
  Flex,
  Input,
  Spacer,
  Text,
  Button,
  TabList,
  Tab,
  Tabs,
  TabPanels,
  TabPanel,
  Stack,
  Select,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { CUIAutoComplete, Item } from "chakra-ui-autocomplete";
import { JobSearchParams } from "../../../types/job";
import { dateToUnix } from "../../../utils/utils";

import style from "./JobFilter.module.css";
import { Stepper } from "./Stepper";
import { useEffect, useState } from "react";
import { JobTag } from "../../../types/job";
import { useGetUser, UserRole } from "../../../utils/auth";

interface JobFilterProps {
  params: JobSearchParams;
  setParams: (p: JobSearchParams) => void;
  partitions: string[];
  tags: JobTag[];
  tabTitles?: JSX.Element[];
  tabPanels?: JSX.Element[];
  mustApply?: boolean;
}

export const JobFilter = ({
  params,
  setParams,
  partitions,
  tags,
  tabTitles,
  tabPanels,
  mustApply = false,
}: JobFilterProps) => {
  const [tagPickerItems, _] = useState(
    tags?.map((tag) => {
      return { value: tag.Id.toString(), label: tag.Name };
    }) ?? []
  );
  const [selectedTags, setSelectedTags] = useState<Item[]>([]);
  const [filterParams, setFilterParams] = useState<JobSearchParams>({
    ...params,
    Time: [
      // two weeks back
      dateToUnix(new Date(Math.floor(Date.now()) - 60 * 60 * 24 * 14 * 1000)),
      dateToUnix(new Date()),
    ],
  });
  const [shouldApply, setShouldApply] = useState(false);
  const user = useGetUser();
  const tagListBackground = useColorModeValue("gray.400", "gray.500");
  const hoverBackground = useColorModeValue("gray.200", "gray.700");
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
  const timezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
  const getDateString = (d: number) =>
    new Date(d - timezoneOffset).toISOString().slice(0, 16);

  const handleSelectedItemsChange = (selectedItems?: Item[]) => {
    if (selectedItems) {
      setSelectedTags(selectedItems);
      setFilterParams({
        ...params,
        Tags: selectedItems.map(
          (item) =>
            tags.find((tag) => tag.Id.toString() === item.value) as JobTag
        ),
      });
    }
  };

  return (
    <Stack>
      <Tabs>
        <TabList>
          <Tab>Job Data</Tab>
          <Tab>Time</Tab>
          <Tab>Tags</Tab>
          {tabTitles}
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack>
              <Flex gap={3}>
                {user.Roles.includes(UserRole.Admin) ? (
                  <Input
                    value={filterParams.UserName}
                    placeholder="User Id"
                    maxW="15ch"
                    onChange={(ev) =>
                      setFilterParams({ ...params, UserName: ev.target.value })
                    }
                  />
                ) : null}
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
                  value={String(filterParams.IsRunning)}
                  onChange={(e) => {
                    const isRunning =
                      e.target.value === "undefined"
                        ? undefined
                        : e.target.value === "true";
                    setFilterParams({
                      ...filterParams,
                      IsRunning: isRunning,
                    });
                  }}
                >
                  <option value="true">Show Only Running Jobs</option>
                  <option value="false">Show Only Finished Jobs</option>
                  <option value="undefined">Show All Jobs</option>
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
          <TabPanel>
            <CUIAutoComplete
              items={tagPickerItems}
              placeholder={"Select Tags..."}
              label={""}
              selectedItems={selectedTags}
              onSelectedItemsChange={(changes) =>
                handleSelectedItemsChange(changes.selectedItems)
              }
              listStyleProps={{ bg: tagListBackground }}
              highlightItemBg={hoverBackground}
              disableCreateItem
            ></CUIAutoComplete>
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
