import { JobMetadata } from "../../types/job";

import {
  Alert, AlertDescription,
  AlertIcon, AlertTitle,
  Box,
  Center,
  Divider,
  Grid,
  GridItem,
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
  compactView?: boolean;
}

/**
 * JobList is a react component displaying given jobs in a list.
 * This component is used as an overview over the available jobs.
 * 
 * @param jobs The jobs.
 * @param radarChartMetrics The metrics to show in the radar-chart.
 * @param limit The limit of jobs to show on one page. To display all jobs on one page set this value to 0.
 * @param page The currently selected page.
 * @param compactView Determines if the list should use all available space for a more compact list design.
 * @returns The component.
 */
export const JobList = ({
  jobs,
  radarChartMetrics,
  limit,
  page,
  compactView = false,
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
  if (compactView) {
    return (
      <Center id="joblist">
        <Grid templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)', '2xl': 'repeat(5, 1fr)'}} gap={6} ml={2} mr={2}>
          {slice.map((job) => (
            <GridItem w='100%' key={job.Id} colSpan={1}>
              <JobListItem
                job={job}
                radarChartMetrics={radarChartMetrics}
                compactView={true}
              />
            </GridItem>
          ))}
        </Grid>
      </Center>
    )
  }

  return (
    <Center id="joblist">
      <Stack>
        {slice.map((job) => (
          <JobListItem
            key={job.Id}
            job={job}
            radarChartMetrics={radarChartMetrics}
          />
        ))}
      </Stack>
    </Center>
  );
};

interface JobListItemProps {
  job: JobMetadata;
  radarChartMetrics: string[];
  compactView?: boolean;
}

/**
 * JobListItem is a react component visualizing one job in the {@link JobList}.
 * This component gives an overview over one job.
 * By clicking on this component the user is referred to the a detailed page about the corresponding job.
 * 
 * @param job The job to display.
 * @param radarChartMetrics The metrics that might be contained in the radar-chart.
 * @param compactView If the listitem should be displayed more compact
 * @returns The component.
 */
export const JobListItem = ({
  job,
  radarChartMetrics,
  compactView = false,
}: JobListItemProps) => {
  const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let radarChartData: any[] = [];
  if (job.Data) {
    radarChartData = job.Data.filter((val) =>
      radarChartMetrics.includes(val.Config.GUID)
    ).map((val) => {
      let deviceMax = Math.max(val.Config.MaxPerNode, val.Config.MaxPerType);
      deviceMax = deviceMax !== 0 ? deviceMax : val.Mean;
      return {
        mean: val.Mean / deviceMax,
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

  if (compactView) {
    return (
      <LinkBox>
      <LinkOverlay href={`/job/${job.Id}`}>
        <Stack
          direction={"column"}
          divider={
            <StackDivider marginX="3% !important" borderColor={borderColor} />
          }
          gap={2}
          border="1px"
          borderColor={borderColor}
          borderRadius={5}
        >
          <Stack m="auto" direction="row" flexGrow={1}>
            <Stack textAlign="start" m={5} pl={5}>
              <Heading size="sm" textDecoration="underline">
                {job.Id}
              </Heading>
              <Text>
                User: {job.UserName} ({job.GroupName})
              </Text>
              <Text>Name: {job.JobName}</Text>
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
          </Stack>
          <Box pr={{ base: 0, lg: 5 }} pb={{ base: 5, lg: 0 }}>
            {!dataAvailable ? (
              <Center h="100%" mb={2}>
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
                  </Center>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </LinkOverlay>
    </LinkBox>
    );
  }  

  return (
    <LinkBox>
      <LinkOverlay href={`/job/${job.Id}`}>
        <Stack
          direction={{ base: "column", lg: "row" }}
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
          <Box pr={{ base: 0, lg: 5 }} pb={{ base: 5, lg: 0 }}>
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
