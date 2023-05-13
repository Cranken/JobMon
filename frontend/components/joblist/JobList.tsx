import { JobMetadata } from "../../types/job";
import {
  Alert, AlertDescription,
  AlertIcon, AlertTitle,
  Box,
  Center,
  Divider,
  Heading,
  LinkBox,
  LinkOverlay,
  Stack,
  StackDivider,
  Tag,
  Text,
  useColorModeValue,
  Wrap,
} from "@chakra-ui/react";
import { RadarChart } from "../charts/RadarChart";
import React from "react";

interface JobListProps {
  jobs: JobMetadata[];
  radarChartMetrics: string[];
  filter?: (job: JobMetadata) => boolean;
  sortBy?: string;
  limit: number;
  page: number;
  isWideDevice?: boolean;
}

export const JobList = ({
  jobs,
  radarChartMetrics,
  limit,
  page,
  isWideDevice = true,
}: JobListProps) => {
  const slice =
    limit !== 0
      ? jobs.slice(limit * (page - 1), limit * (page - 1) + limit)
      : jobs;
  if (slice.length == 0) {
    return (
        <Center id="nojobinfo">
          <Box>
            <Alert
                status="info"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                marginLeft="15px"
                marginRight="15px"
                width="calc(100% - 30px)">
              <AlertIcon />
              <AlertTitle mt={4} mb={1}>
                No jobs can be shown here.
              </AlertTitle>
              <AlertDescription>
                There are multiple possible reasons, why you can not see any jobs.
                Either you have not ran any jobs with the account you are currently logged in with or all your jobs were executed too long ago
              </AlertDescription>
            </Alert>
          </Box>
        </Center>
    );
  }
  return (
    <Center id="joblist">
      <Stack>
        {slice.map((job) => (
          <JobListItem
            key={job.Id}
            job={job}
            radarChartMetrics={radarChartMetrics}
            isWideDevice={isWideDevice}
          />
        ))}
      </Stack>
    </Center>
  );
};

interface JobListItemProps {
  job: JobMetadata;
  radarChartMetrics: string[];
  isWideDevice?: boolean;
}

export const JobListItem = ({
  job,
  radarChartMetrics,
  isWideDevice = true,
}: JobListItemProps) => {
  const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let radarChartData: any[] = [];
  if (job.Data) {
    radarChartData = job.Data.filter((val) =>
      radarChartMetrics.includes(val.Config.GUID)
    ).map((val) => {
      let deviceMax = Math.max(val.Config.MaxPerNode, val.Config.MaxPerType);
      deviceMax = deviceMax !== 0 ? deviceMax : val.Data;
      return {
        mean: val.Data / deviceMax,
        max: val.Max / deviceMax,
        title: val.Config.DisplayName,
      };
    });
    radarChartData.sort((a, b) => (a.title < b.title ? -1 : 1));
  }

  let dataAvailable = true;
  let reason = "";
  if (job.IsRunning) {
    dataAvailable = false;
    reason = "Job is still running. No metadata available yet.";
  } else if (
    !job.Data ||
    radarChartData.length === 0
  ) {
    dataAvailable = false;
    reason = "No metadata metrics for job available.";
  } else if (
    job.StopTime - job.StartTime < 120
  ) {
    dataAvailable = false;
    reason = "No metadata metrics available for jobs shorter than two minutes.";
  }

  return (
    <LinkBox>
      <LinkOverlay href={`/job/${job.Id}`}>
        <Stack
          direction={ isWideDevice ? "row" : "column" }
          divider={
            <StackDivider marginY="3% !important" borderColor={borderColor} />
          }
          gap={2}
          border="1px"
          borderColor={borderColor}
          borderRadius={5}
        >
          <Stack m="auto" direction="row" height="100%" flexGrow={1}>
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
              {job.Tags && job.Tags.length > 0 ? (
                <Wrap>
                  {job.Tags.map((tag) => (
                    <Tag key={tag.Name}>{tag.Name}</Tag>
                  ))}
                </Wrap>
              ) : null}
            </Stack>
            <Center height="90%">
              <Divider orientation="vertical" borderColor={borderColor} />
            </Center>
          </Stack>
          <Box pr={ isWideDevice ? 5 : 0} pb={ isWideDevice ? 0 : 5}>
            {!dataAvailable ? (
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
                {job.IsRunning ? null : (
                  <Center width="100%" height="100%">
                    {radarChartData ? (
                      <RadarChart
                        data={radarChartData}
                        value={(d) => d.mean}
                        title={(d) => d.title}
                        maxVal={(d) => d.max}
                        size={350}
                        margin={60}
                      ></RadarChart>
                    ) : null}
                    {/* {flopsData && membwData ? (
                      <Center w={600} h={350}>
                        <RooflinePlot
                          flops={Object.values(flopsData.Data)}
                          flops_max={flopsData.Config.MaxPerNode}
                          flops_unit={flopsData.Config.Unit}
                          mem_bw={Object.values(membwData.Data)}
                          mem_bw_max={membwData.Config.MaxPerNode}
                          mem_bw_unit={flopsData.Config.Unit}
                          width={600}
                          height={350}
                        ></RooflinePlot>
                      </Center>
                    ) : null} */}
                  </Center>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </LinkOverlay>
    </LinkBox>
  );
};

export default JobList;
