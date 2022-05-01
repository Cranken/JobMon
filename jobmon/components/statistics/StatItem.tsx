import { JobListData } from "../../types/job";
import { groupBy } from "../../utils/utils";
import { JobMetadata } from "../../types/job";
import { Box } from "@chakra-ui/react";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { Panel } from "../panelmanager/PanelManager";
import { OPanel } from "./../panelmanager/PanelManager";

interface StatItemProps {
  data: JobListData;
  panel: Panel;
}

export const StatItem = ({ data, panel }: StatItemProps) => {
  if (data) {
    return (
      <Box maxH={800} maxW={1000} overflowY={"auto"} mx={2}>
        {renderPanel(data, panel)}
      </Box>
    );
  } else {
    return null;
  }
};

const renderPanel = (data: JobListData, panel: Panel) => {
  switch (OPanel[panel]) {
    case OPanel.Partition:
      return renderBarChart(data, "Partition");
    case OPanel.GroupName:
      return renderBarChart(data, "GroupName");
    case OPanel.NumNodes:
      return renderBarChart(data, "NumNodes");
    case OPanel.Username:
      return renderBarChart(data, "UserName");
  }

  return null;
};

const renderBarChart = (data: JobListData, attribute: keyof JobMetadata) => {
  const groups = groupBy(data?.Jobs, (obj) => obj[attribute].toString());
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
