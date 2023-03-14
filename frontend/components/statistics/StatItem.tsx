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
import { OPanel } from "../panelmanager/PanelManager";
import React, { useState } from "react";
import humanizeDuration from "humanize-duration";
import { BarChart } from "../charts/BarChart";
import { QuestionIcon } from "@chakra-ui/icons";

/**
 * shortHumanizer is a function to convert durations from milliseconds into units with better readability.
 */
const shortHumanizer = humanizeDuration.humanizer({
  // Defining new language for the humanization.
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

/**
 * StatItemProps is a container that associates data and panels.
 */
interface StatItemProps {
  data: JobListData;
  panel: Panel;
}

/**
 * Creates item for the statistics if possible.
 * @param data The data to display in the statistics item.
 * @param panel The panel to use for the display.
 * @return The fragment to render the statistics or null if no data was given.
 */
export const StatItem = ({ data, panel }: StatItemProps) => {
  //Retrieves the rendered panel.
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

/**
 * Selects the corret renderer for the given panel-key and renders the statistics.
 * @param data The data to render
 * @param panel The panel
 * @return The rendered statistics in case the value of panel was supported, null otherwise.
 */
const useRenderPanel = (data: JobListData, panel: Panel) => {
  // State for statistics computing grouped values.
  const [groupKey, setGroupKey] = useState("Id");
  // Select the panel.
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
        (acc, cv) => acc + cv.NumNodes * (cv.StopTime - cv.StartTime),
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
        (acc, cv) => acc + cv.StopTime - cv.StartTime,
        groupKey,
        setGroupKey,
        `Job length grouped by ${groupKey}`,
        OPanel[panel]
      );
  }

  return null;
};

/**
 * Renders a barchart for panels that do not group values by keys.
 * @param data The data.
 * @param attribute The attribute to filter from the data.
 * @param sortByValue Determines if the values should be sorted
 * @param horizontal Determines if the orientation of the barchart. True for horizontal, false for vertical bars.
 * @param tooltip The tooltip describing the panel
 * @param title The title of the panel
 */
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
            valueLabel="Occurences"
            columnLabel={attribute}
          ></BarChart>
        </Box>
      )}
    </Stack>
  );
};

/**
 * Renders a barchart for panels, grouping values with the given key.
 * @param data The data
 * @param panel The panel currently displayed
 * @param reduceFunction The function used to reduce the data.
 * @param groupKey The key to group vales from data
 * @param setGroupKey A function to set a new key grouping values
 * @param tooltip The tooltip describing the panel
 * @param title The title of the panel
 */
const renderComputedAttribute = (
  data: JobListData,
  panel: Panel,
  reduceFunction: (acc: number, cv: JobMetadata) => number,
  groupKey: string,
  setGroupKey: (k: string) => void,
  tooltip: string,
  title: string
) => {

  // extracting grouped values from data. Values are grouped by groupKey afterwards.
  const groups = groupBy(data?.Jobs ?? [], (obj) =>
    obj[groupKey as keyof JobMetadata].toString()
  );
  let tuples: [string, number][] = [];

  // Reducing data-groups with the given reduction function. Groups are reduced to a single value-
  tuples = Object.keys(groups).map((g) => [
    g,
    groups[g].reduce(reduceFunction, 0),
  ]);
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
