import { useState, useEffect } from "react";
import JobList from "../components/joblist/JobList";
import { JobMetadata } from "./../types/job";

export const Jobs = () => {
  const jobs = useGetJobs();

  return jobs ? <JobList jobs={jobs} /> : <div>Loading</div>;
};

export const useGetJobs = () => {
  const [jobs, setJobs] = useState<JobMetadata[]>();
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/jobs").then((res) =>
      res.json().then((data) => setJobs(data))
    );
  }, []);
  return jobs;
};

export default Jobs;
