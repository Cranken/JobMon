import { JobMetadata } from "./../../types/job";
import styles from "./JobList.module.css";

interface JobListProps {
  jobs: JobMetadata[];
  width?: string;
  height?: string;
}

export const JobList = ({ jobs, width, height }: JobListProps) => {
  const style = {
    width: width || "50vw",
    height: height || "auto",
  };
  return (
    <div className={styles.list} style={style}>
      <div className={styles.listHeader}>
        <text>Job ID</text>
        <text>User ID</text>
        <text>Number of Nodes</text>
        <text>Start Time</text>
        <text>End Time</text>
      </div>
      {jobs.map((job) => (
        <JobListItem key={job.Id} job={job} />
      ))}
    </div>
  );
};

interface JobListItemProps {
  job: JobMetadata;
}

export const JobListItem = ({ job }: JobListItemProps) => {
  return (
    <a className={styles.listItem} href={`/job/${job.Id}`}>
      <text>{job.Id}</text>
      <text>{job.UserId}</text>
      <text>{job.NumNodes}</text>
      <text>{new Date(job.StartTime * 1000).toLocaleString()}</text>
      <text>{new Date(job.StopTime * 1000).toLocaleString()}</text>
    </a>
  );
};

export default JobList;
