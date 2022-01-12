import { JobMetadata, JobMetadataData } from "./../../types/job";
import styles from "./JobList.module.css";
import {
  Alert,
  AlertIcon,
  Box,
  Center,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  LinkBox,
  LinkOverlay,
  Stack,
  Tag,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Histogram } from "../charts/Histogram";
import { RadarChart } from "../charts/RadarChart";
import * as d3 from "d3";

interface JobListProps {
  jobs: JobMetadata[];
  displayMetrics: string[];
  radarChartMetrics: string[];
  filter?: (job: JobMetadata) => boolean;
  sortBy?: string;
  width?: string;
  height?: string;
}

export const JobList = ({
  jobs,
  displayMetrics,
  radarChartMetrics,
  width,
  height,
}: JobListProps) => {
  jobs.sort((a, b) => (a.StartTime < b.StartTime ? 1 : -1));
  return (
    <Center>
      <Stack>
        {jobs.map((job) => (
          <JobListItem
            key={job.Id}
            job={job}
            displayMetrics={displayMetrics}
            radarChartMetrics={radarChartMetrics}
          />
        ))}
      </Stack>
    </Center>
  );
};

interface JobListItemProps {
  job: JobMetadata;
  displayMetrics: string[];
  radarChartMetrics: string[];
}

export const JobListItem = ({
  job,
  displayMetrics,
  radarChartMetrics,
}: JobListItemProps) => {
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
  let sortedData: JobMetadataData[] = [];
  if (job.Data) {
    sortedData = job.Data.filter((val) =>
      displayMetrics.includes(val.Config.Measurement)
    ).sort((a, b) => (a.Config.Measurement < b.Config.Measurement ? -1 : 1));
  }

  let histogramAvailable = true;
  let reason = "";
  if (job.IsRunning) {
    histogramAvailable = false;
    reason = "Job is still running. No metric data available yet.";
  }
  // } else if (job.NumNodes <= 1) {
  //   histogramAvailable = false;
  //   reason = "No histogram available for jobs with less than two nodes.";
  // } else if (job.StopTime - job.StartTime < 300) {
  //   histogramAvailable = false;
  //   reason = "No histogram available for short jobs (<5Min).";
  // }
  const radarChartData = job.Data.filter((val) =>
    radarChartMetrics.includes(val.Config.Measurement)
  ).map((val) => {
    const mean = d3.mean(Object.values(val.Data)) ?? 1;
    const max = Math.max(val.Config.MaxPerNode, val.Config.MaxPerType);
    return {
      val: mean,
      max: max !== 0 ? max : mean,
      title: val.Config.DisplayName,
    };
  });
  radarChartData.sort((a, b) => (a.title < b.title ? -1 : 1));

  return (
    <LinkBox>
      <LinkOverlay href={job.IsRunning ? undefined : `/job/${job.Id}`}>
        <Stack
          direction="row"
          gap={2}
          border="1px"
          borderColor={borderColor}
          borderRadius={5}
        >
          <Stack m="auto" direction="row" height="100%" borderRight="1px">
            <Stack textAlign="start" m={5} pl={5}>
              <Heading size="sm" textDecoration="underline">
                {job.Id}
              </Heading>
              <Text>
                User: {job.UserName} ({job.GroupName})
              </Text>
              <Text>Partition: {job.Partition}</Text>
              <Text>Name: {job.JobName}</Text>
              <Stack direction="row" justify="space-between">
                <Text>Nodes: {job.NumNodes}</Text>
                {job.GPUsPerNode !== 0 ? (
                  <Text>GPUs: {job.GPUsPerNode * job.NumNodes}</Text>
                ) : null}
              </Stack>
              <Text>
                Start: {new Date(job.StartTime * 1000).toLocaleString()}
              </Text>
              {job.IsRunning ? (
                <Box>
                  <Tag colorScheme="green">Running</Tag>
                </Box>
              ) : (
                <Text>
                  End: {new Date(job.StopTime * 1000).toLocaleString()}
                </Text>
              )}
            </Stack>
            <Center height="90%">
              <Divider orientation="vertical" borderColor={borderColor} />
            </Center>
          </Stack>
          <Box>
            {!histogramAvailable ? (
              <Center h="100%">
                <Box>
                  <Alert status="info">
                    <AlertIcon />
                    {reason}
                  </Alert>
                </Box>
              </Center>
            ) : (
              <Stack direction="row" gap={2} h="100%">
                <Center width="100%" height="100%">
                  <RadarChart
                    data={radarChartData}
                    value={(d) => d.val / d.max}
                    title={(d) => d.title}
                    size={350}
                    margin={60}
                  ></RadarChart>
                </Center>
                {sortedData.map((dat) => (
                  <Center
                    key={dat.Config.Measurement}
                    width="100%"
                    height="100%"
                  >
                    <Histogram
                      data={Object.values(dat.Data)}
                      x={(d) => d}
                      width={300}
                      height={180}
                      yLabel="Number of Nodes"
                      xLabel={dat.Config.DisplayName}
                      xDomain={[0, dat.Config.MaxPerNode]}
                    />
                  </Center>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </LinkOverlay>
    </LinkBox>
  );
};

export default JobList;
