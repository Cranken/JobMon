import { Box, Center, Grid, Spinner } from "@chakra-ui/react";
import {
  Panel,
  PanelManager,
  usePanels,
} from "../components/panelmanager/PanelManager";
import { useGetJobs } from "../utils/utils";
import { StatItem } from "./../components/statistics/StatItem";
import { JobMetadata } from "./../types/job";
import { PanelControl } from "./../components/panelmanager/PanelControl";

export const Statistics = () => {
  const jobListData = useGetJobs();
  const [panels, addPanel, setPanelAttribute, removePanel] =
    usePanels<JobMetadata>("statistics-panel-config");
  if (jobListData) {
    return (
      <Box m={5}>
        <PanelManager
          AllowedPanels={[Panel.HorizontalBarChart]}
          AddPanel={(p: Panel) =>
            addPanel({
              Type: p,
              Attribute: "Partition",
              Position: panels.length,
            })
          }
        ></PanelManager>
        <Grid templateColumns="repeat(2, 1fr)">
          {panels.map((panel, i) => (
            <PanelControl
              key={panel.Position + panel.Attribute}
              removePanel={removePanel}
              panelConfig={panel}
              setPanelAttribute={setPanelAttribute}
            >
              <StatItem
                data={jobListData}
                attribute={panel.Attribute}
              ></StatItem>
            </PanelControl>
          ))}
        </Grid>
      </Box>
    );
  }
  return (
    <Center>
      <Spinner />
    </Center>
  );
};

export default Statistics;
