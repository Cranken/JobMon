import { JobMetadata } from "./../../types/job";
import styles from "./JobList.module.css";
import {
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
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Histogram } from "../charts/Histogram";

interface JobListProps {
  jobs: JobMetadata[];
  filter?: (job: JobMetadata) => boolean;
  sortBy?: string;
  width?: string;
  height?: string;
}

export const JobList = ({
  jobs,
  width,
  height,
  filter = (_) => true,
}: JobListProps) => {
  const style = {
    width: width ?? "100%",
    height: height ?? "auto",
  };
  return (
    <Stack>
      {jobs.filter(filter).map((job) => (
        <JobListItem key={job.Id} job={job} />
      ))}
    </Stack>
  );
};

interface JobListItemProps {
  job: JobMetadata;
}

export const JobListItem = ({ job }: JobListItemProps) => {
  const borderColor = useColorModeValue("gray.500", "whiteAlpha.800");
  const sortedData = job.Data.sort((a, b) =>
    a.Config.Measurement < b.Config.Measurement ? -1 : 1
  );
  return (
    <LinkBox>
      <LinkOverlay href={`/job/${job.Id}`}>
        <Grid
          templateColumns="repeat(7, 1fr)"
          gap={2}
          border="1px"
          borderColor={borderColor}
          borderRadius={5}
          m={2}
        >
          <GridItem colSpan={1}>
            <Flex height="100%">
              <Stack textAlign="start" m={5} pl={5}>
                <Heading size="sm" textDecoration="underline">
                  {job.Id}
                </Heading>
                <Text>User: {job.UserId}</Text>
                <Text>Nodes: {job.NumNodes}</Text>
                <Text>
                  Start: {new Date(job.StartTime * 1000).toLocaleString()}
                </Text>
                <Text>
                  End: {new Date(job.StopTime * 1000).toLocaleString()}
                </Text>
              </Stack>
              <Center height="90%" m="auto">
                <Divider orientation="vertical" borderColor={borderColor} />
              </Center>
            </Flex>
          </GridItem>
          <GridItem colSpan={6}>
            <Stack direction="row" gap={2} h="100%">
              {job.Data.map((dat) => (
                <Center key={dat.Config.Measurement}>
                  <Histogram
                    data={dat.Data}
                    x={(d) => d}
                    // width={250}
                    width={window.document.body.clientWidth / 7}
                    height={180}
                    xLabel={dat.Config.DisplayName}
                  />
                </Center>
              ))}
            </Stack>
          </GridItem>
        </Grid>
      </LinkOverlay>
    </LinkBox>
  );
};

export default JobList;
