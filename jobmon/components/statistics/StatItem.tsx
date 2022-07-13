import { JobListData } from "../../types/job";
import { groupBy } from "../../utils/utils";
import { JobMetadata } from "../../types/job";
import {
  Box,
  Center,
  Flex,
  Heading,
  Select,
  Spacer,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { Panel } from "../panelmanager/PanelManager";
import { OPanel } from "./../panelmanager/PanelManager";
import { useState } from "react";
import humanizeDuration from "humanize-duration";
import { BarChart } from "../charts/BarChart";
import { QuestionIcon } from "@chakra-ui/icons";

const shortHumanizer = humanizeDuration.humanizer({
  language: "short",
  languages: {
    short: {
      y: () => "Y",
      mo: () => "M",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
});

interface StatItemProps {
  data: JobListData;
  panel: Panel;
}

export const StatItem = ({ data, panel }: StatItemProps) => {
  const element = useRenderPanel(data, panel);
  if (data) {
    return (
      <Center>
        <Box maxH={800} maxW={1000} overflowY={"auto"} mx={2} h="100%">
          {element}
        </Box>
      </Center>
    );
  } else {
    return null;
  }
};

const useRenderPanel = (data: JobListData, panel: Panel) => {
  const [groupKey, setGroupKey] = useState("Id");
  switch (OPanel[panel]) {
    case OPanel.Partition:
      return renderSimpleAttribute(
        data,
        "Partition",
        true,
        true,
        "Number of jobs per partition",
        OPanel[panel]
      );
    case OPanel.GroupName:
      return renderSimpleAttribute(
        data,
        "GroupName",
        true,
        true,
        "Number of jobs per group",
        OPanel[panel]
      );
    case OPanel.NumNodes:
      return renderSimpleAttribute(
        data,
        "NumNodes",
        false,
        false,
        "Number of jobs which used a specific number of nodes",
        OPanel[panel]
      );
    case OPanel.Username:
      return renderSimpleAttribute(
        data,
        "UserName",
        true,
        true,
        "Number of jobs per user",
        OPanel[panel]
      );
    case OPanel.ComputeTime:
      return renderComputedAttribute(
        data,
        panel,
        groupKey,
        setGroupKey,
        `Compute time grouped by ${groupKey}. ` +
          "Compute time is calculated as number of nodes * job length",
        OPanel[panel]
      );
    case OPanel.JobLength:
      return renderComputedAttribute(
        data,
        panel,
        groupKey,
        setGroupKey,
        `Job length grouped by ${groupKey}`,
        OPanel[panel]
      );
  }

  return null;
};

const renderSimpleAttribute = (
  data: JobListData,
  attribute: keyof JobMetadata,
  sortByValue: boolean,
  horizontal: boolean,
  tooltip: string,
  title: string
) => {
  const groups = groupBy(data?.Jobs ?? [], (obj) => obj[attribute].toString());
  const tuples: [string, number][] = Object.keys(groups).map((attribute) => [
    attribute,
    groups[attribute].length,
  ]);
  if (sortByValue) {
    tuples.sort((a, b) => b[1] - a[1]);
  }
  return (
    <Stack>
      <Flex gap={3}>
        <Heading size="lg">{title}</Heading>
        <Tooltip label={tooltip}>
          <QuestionIcon mt={2}></QuestionIcon>
        </Tooltip>
      </Flex>
      {horizontal ? (
        <HorizontalBarChart
          data={tuples.slice(0, 20)}
          column={(t) => t[0]}
          value={(t) => t[1]}
          yLabel={attribute}
        ></HorizontalBarChart>
      ) : (
        <Box py={6}>
          <BarChart
            data={tuples}
            column={(t) => t[0]}
            value={(t) => t[1]}
            columnLabel="Occurences"
            valueLabel={attribute}
          ></BarChart>
        </Box>
      )}
    </Stack>
  );
};

const renderComputedAttribute = (
  data: JobListData,
  panel: Panel,
  groupKey: string,
  setGroupKey: (k: string) => void,
  tooltip: string,
  title: string
) => {
  const groups = groupBy(data?.Jobs ?? [], (obj) =>
    obj[groupKey as keyof JobMetadata].toString()
  );
  let tuples: [string, number][] = [];
  switch (OPanel[panel]) {
    case OPanel.ComputeTime:
      tuples = Object.keys(groups).map((g) => [
        g,
        groups[g].reduce(
          (acc, cv) => acc + cv.NumNodes * (cv.StopTime - cv.StartTime),
          0
        ),
      ]);
      break;
    case OPanel.JobLength:
      tuples = Object.keys(groups).map((g) => [
        g,
        groups[g].reduce((acc, cv) => acc + cv.StopTime - cv.StartTime, 0),
      ]);
      break;
  }
  tuples.sort((a, b) => b[1] - a[1]);
  return (
    <Stack>
      <Stack direction="row" pt={2} textAlign="center">
        <Heading size="lg" width="">
          {title}
        </Heading>
        <Tooltip label={tooltip}>
          <QuestionIcon></QuestionIcon>
        </Tooltip>
        <Spacer></Spacer>
        <Text alignSelf="center" width="10%">
          Group by:
        </Text>
        <Select
          value={groupKey}
          onChange={(e) => setGroupKey(e.target.value)}
          w="fit-content"
        >
          <option value="Id">Job Id</option>
          <option value="GroupName">Group Name</option>
          <option value="UserName">User Name</option>
          <option value="Partition">Partition</option>
        </Select>
      </Stack>
      <HorizontalBarChart
        data={tuples.slice(0, 20)}
        column={(t) => t[0]}
        value={(t) => t[1]}
        xLabel={panel}
        yLabel={groupKey}
        xFormat={(v) => shortHumanizer(v.valueOf() * 1000, { largest: 2 })}
        valueFormat={(d) =>
          shortHumanizer(d[1] * 1000, {
            largest: 3,
            spacer: "",
          })
        }
      ></HorizontalBarChart>
    </Stack>
  );
};
