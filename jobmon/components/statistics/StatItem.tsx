import { JobListData } from "../../types/job";
import { groupBy } from "../../utils/utils";
import { JobMetadata } from "../../types/job";
import { Box, Select } from "@chakra-ui/react";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { Panel } from "../panelmanager/PanelManager";
import { OPanel } from "./../panelmanager/PanelManager";
import { useState } from "react";
import humanizeDuration from "humanize-duration";

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
      <Box maxH={800} maxW={1000} overflowY={"auto"} mx={2}>
        {element}
      </Box>
    );
  } else {
    return null;
  }
};

const useRenderPanel = (data: JobListData, panel: Panel) => {
  const [groupKey, setGroupKey] = useState("Id");
  switch (OPanel[panel]) {
    case OPanel.Partition:
      return renderSimpleAttribute(data, "Partition");
    case OPanel.GroupName:
      return renderSimpleAttribute(data, "GroupName");
    case OPanel.NumNodes:
      return renderSimpleAttribute(data, "NumNodes");
    case OPanel.Username:
      return renderSimpleAttribute(data, "UserName");
    case OPanel.ComputeTime:
    case OPanel.JobLength:
      return renderComputedAttribute(data, panel, groupKey, setGroupKey);
  }

  return null;
};

const renderSimpleAttribute = (
  data: JobListData,
  attribute: keyof JobMetadata
) => {
  const groups = groupBy(data?.Jobs ?? [], (obj) => obj[attribute].toString());
  const tuples: [string, number][] = Object.keys(groups).map((attribute) => [
    attribute,
    groups[attribute].length,
  ]);
  tuples.sort((a, b) => b[1] - a[1]);
  return (
    <HorizontalBarChart
      data={tuples.slice(0, 20)}
      column={(t) => t[0]}
      value={(t) => t[1]}
      yLabel={attribute}
    ></HorizontalBarChart>
  );
};

const renderComputedAttribute = (
  data: JobListData,
  panel: Panel,
  groupKey: string,
  setGroupKey: (k: string) => void
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
    <>
      <Select value={groupKey} onChange={(e) => setGroupKey(e.target.value)}>
        <option value="Id">Job Id</option>
        <option value="GroupName">Group Name</option>
        <option value="UserName">User Name</option>
        <option value="Partition">Partition</option>
      </Select>
      <HorizontalBarChart
        data={tuples.slice(0, 20)}
        column={(t) => t[0]}
        value={(t) => t[1]}
        xLabel={panel}
        yLabel={"Job Id"}
        xFormat={(v) => shortHumanizer(v.valueOf() * 1000, { largest: 2 })}
        valueFormat={(d) =>
          shortHumanizer(d[1] * 1000, {
            largest: 3,
            spacer: "",
          })
        }
      ></HorizontalBarChart>
    </>
  );
};
