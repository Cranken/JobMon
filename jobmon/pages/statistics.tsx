import { Box, Center, Grid, Spinner } from "@chakra-ui/react";
import { useGetJobs } from "../utils/utils";
import { StatItem } from "./../components/statistics/StatItem";

export const Statistics = () => {
  const jobListData = useGetJobs();
  if (jobListData) {
    return (
      <Box m={5}>
        <Grid templateColumns="repeat(2, 1fr)">
          <StatItem data={jobListData} attribute={"Partition"}></StatItem>
          <StatItem data={jobListData} attribute={"UserName"}></StatItem>
          <StatItem data={jobListData} attribute={"NumNodes"}></StatItem>
          <StatItem data={jobListData} attribute={"GroupName"}></StatItem>
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
