import { Box, Center, Flex, Grid, Spinner, Stack } from "@chakra-ui/react";
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
            <Stack
              border="1px"
              borderColor="gray.700"
              borderRadius="md"
              m={2}
              key={panel.Position + panel.Attribute}
            >
              <PanelControl
                removePanel={removePanel}
                panelConfig={panel}
                setPanelAttribute={setPanelAttribute}
              >
                <option value="Partition">Partition</option>
                <option value="UserName">Username</option>
                <option value="NumNodes">Number of Nodes</option>
                <option value="GroupName">Group Name</option>
              </PanelControl>
              <StatItem
                data={jobListData}
                attribute={panel.Attribute}
              ></StatItem>
            </Stack>
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
