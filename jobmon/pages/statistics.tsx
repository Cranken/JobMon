import { Box, Center, Grid, Spinner, Stack } from "@chakra-ui/react";
import { Panel, PanelManager } from "../components/panelmanager/PanelManager";
import { useGetJobs, useStorageState } from "../utils/utils";
import { StatItem } from "./../components/statistics/StatItem";

export const Statistics = () => {
  const jobListData = useGetJobs();
  const [selectedPanels, setSelectedPanels] = useStorageState<Panel[]>(
    "statistics-panel-config",
    []
  );
  if (jobListData) {
    return (
      <Box m={5}>
        <PanelManager
          selectedPanels={selectedPanels}
          setSelectedPanels={setSelectedPanels}
        ></PanelManager>
        <Grid templateColumns="repeat(2, 1fr)">
          {selectedPanels.map((panel, i) => (
            <Stack
              border="1px"
              borderColor="gray.700"
              borderRadius="md"
              m={2}
              key={panel}
            >
              <StatItem data={jobListData} panel={panel}></StatItem>
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
