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

interface JobListProps {
  jobs: JobMetadata[];
  displayMetrics: string[];
  filter?: (job: JobMetadata) => boolean;
  sortBy?: string;
  width?: string;
  height?: string;
}

export const JobList = ({
  jobs,
  displayMetrics,
  width,
  height,
}: JobListProps) => {
  jobs.sort((a, b) => (a.StartTime < b.StartTime ? 1 : -1));
  return (
    <Center>
      <Stack w={width ?? "1280px"}>
        {jobs.map((job) => (
          <JobListItem key={job.Id} job={job} displayMetrics={displayMetrics} />
        ))}
      </Stack>
    </Center>
  );
};

interface JobListItemProps {
  job: JobMetadata;
  displayMetrics: string[];
}

export const JobListItem = ({ job, displayMetrics }: JobListItemProps) => {
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
  } else if (job.NumNodes <= 1) {
    histogramAvailable = false;
    reason = "No histogram available for jobs with less than two nodes.";
  } else if (job.StopTime - job.StartTime < 300) {
    histogramAvailable = false;
    reason = "No histogram available for short jobs (<5Min).";
  }

  return (
    <LinkBox>
      <LinkOverlay href={job.IsRunning ? undefined : `/job/${job.Id}`}>
        <Grid
          templateColumns="repeat(7, 1fr)"
          gap={2}
          border="1px"
          borderColor={borderColor}
          borderRadius={5}
        >
          <GridItem colSpan={2}>
            <Flex height="100%">
              <Stack textAlign="start" m={5} pl={5}>
                <Heading size="sm" textDecoration="underline">
                  {job.Id}
                </Heading>
                <Text>User: {job.UserName}</Text>
                <Text>Partition: {job.Partition}</Text>
                <Stack direction="row" justify="space-between">
                  <Text>Nodes: {job.NumNodes}</Text>
                  {job.Partition === "accelerated" ? (
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
              <Center height="90%" m="auto">
                <Divider orientation="vertical" borderColor={borderColor} />
              </Center>
            </Flex>
          </GridItem>
          <GridItem colSpan={5}>
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
                {sortedData.map((dat) => (
                  <Center
                    key={dat.Config.Measurement}
                    width="100%"
                    height="100%"
                  >
                    <Histogram
                      data={dat.Data}
                      x={(d) => d}
                      width={1280 / 4}
                      height={180}
                      yLabel="Number of Nodes"
                      xLabel={dat.Config.DisplayName}
                    />
                  </Center>
                ))}
              </Stack>
            )}
          </GridItem>
        </Grid>
      </LinkOverlay>
    </LinkBox>
  );
};

export default JobList;
