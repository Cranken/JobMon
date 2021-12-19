import React, { useState, useEffect } from "react";
import JobFilter from "../components/joblist/JobFilter";
import JobList from "../components/joblist/JobList";
import { JobMetadata } from "./../types/job";

export const Jobs = () => {
  const jobs = useGetJobs();

  if (!jobs) {
    return <div>Loading</div>;
  }

  let elements = [];
  elements.push(<JobFilter />);
  elements.push(<JobList jobs={jobs} />);

  return <React.Fragment>{elements}</React.Fragment>;
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
