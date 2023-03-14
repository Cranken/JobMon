import {
  Box,
  Center,
  Grid,
  Spinner,
  Stack,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import JobFilter from "../components/joblist/job-filter/JobFilter";
import { Panel, PanelManager } from "../components/panelmanager/PanelManager";
import { JobSearchParams } from "../types/job";
import { useGetJobs, useStorageState } from "../utils/utils";
import { StatItem } from "../components/statistics/StatItem";
import React from "react";
import {useGetUser, UserRole} from "../utils/auth";
import AccessDenied from "./accessDenied";

export const Statistics = () => {
  if (!(useGetUser().Roles?.includes(UserRole.Admin) ?? false)) {
    return <AccessDenied/>;
  }
  const [params, setParams, , isLoadingParams] =
    useStorageState<JobSearchParams>("statistics-params", {
      NumGpus: [0, 224],
      NumNodes: [1, 192],
    });
  const [jobListData, isLoading] = useGetJobs(
    isLoadingParams ? undefined : params
  );
  const [selectedPanels, setSelectedPanels] = useStorageState<Panel[]>(
    "statistics-panel-config",
    []
  );
  if (jobListData && !isLoading) {
    const tabTitles = [<Tab key="metrics">Metrics</Tab>];
    const tabPanels = [
      <TabPanel key="metrics">
        <PanelManager
          selectedPanels={selectedPanels}
          setSelectedPanels={setSelectedPanels}
        ></PanelManager>
      </TabPanel>,
    ];
    return (
      <Box m={5}>
        <Center>
          <Stack borderWidth="1px" borderRadius="lg" p={5} margin={4} w="50%">
            <JobFilter
              params={params}
              setParams={setParams}
              partitions={Object.keys(jobListData.Config.Partitions)}
              tabTitles={tabTitles}
              tabPanels={tabPanels}
              tags={jobListData.Config.Tags}
              mustApply
            ></JobFilter>
          </Stack>
        </Center>
        <Grid templateColumns="repeat(2, 1fr)">
          {selectedPanels.map((panel) => (
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
