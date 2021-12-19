import { JobMetadata } from "./../../types/job";
import styles from "./JobList.module.css";

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
    width: width || "50vw",
    height: height || "auto",
  };
  return (
    <div className={styles.list} style={style}>
      <div className={styles.listHeader}>
        <div>Job ID</div>
        <div>User ID</div>
        <div>Number of Nodes</div>
        <div>Start Time</div>
        <div>End Time</div>
      </div>
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
  return (
    <a className={styles.listItem} href={`/job/${job.Id}`}>
      <div>{job.Id}</div>
      <div>{job.UserId}</div>
      <div>{job.NumNodes}</div>
      <div>{new Date(job.StartTime * 1000).toLocaleString()}</div>
      <div>{new Date(job.StopTime * 1000).toLocaleString()}</div>
    </a>
  );
};

export default JobList;
