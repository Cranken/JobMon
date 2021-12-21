import { JobMetadata } from "./../../types/job";
import styles from "./JobList.module.css";
import {
  Grid,
  LinkBox,
  LinkOverlay,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

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
    width: width ?? "50vw",
    height: height ?? "auto",
  };
  return (
    <div className={styles.list} style={style}>
      <Grid
        className={styles.listHeader}
        templateColumns="repeat(5, 1fr)"
        gap={1}
      >
        <Text>Job ID</Text>
        <Text>User ID</Text>
        <Text>Number of Nodes</Text>
        <Text>Start Time</Text>
        <Text>End Time</Text>
      </Grid>
      {jobs.filter(filter).map((job) => (
        <JobListItem key={job.Id} job={job} />
      ))}
    </div>
  );
};

interface JobListItemProps {
  job: JobMetadata;
}

export const JobListItem = ({ job }: JobListItemProps) => {
  const borderColor = useColorModeValue("whiteAlpha.900", "gray.800");
  return (
    <LinkBox>
      <LinkOverlay href={`/job/${job.Id}`}>
        <Grid
          className={styles.listItem}
          templateColumns="repeat(5, 1fr)"
          gap={1}
          bg={useColorModeValue("gray.300", "gray.700")}
          borderRadius={"md"}
        >
          <Text borderColor={borderColor}>{job.Id}</Text>
          <Text borderColor={borderColor}>{job.UserId}</Text>
          <Text borderColor={borderColor}>{job.NumNodes}</Text>
          <Text borderColor={borderColor}>
            {new Date(job.StartTime * 1000).toLocaleString()}
          </Text>
          <Text borderColor={borderColor}>
            {new Date(job.StopTime * 1000).toLocaleString()}
          </Text>
        </Grid>
      </LinkOverlay>
    </LinkBox>
  );
};

export default JobList;
