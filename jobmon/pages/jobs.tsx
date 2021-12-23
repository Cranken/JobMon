import React, { useState, useEffect } from "react";
import JobFilter from "../components/joblist/JobFilter";
import JobList from "../components/joblist/JobList";
import { checkBetween } from "../utils/utils";
import { JobListData } from "./../types/job";

export const Jobs = () => {
  const jobListData = useGetJobs();
  const [userId, setUserId] = useState("");
  const [startTime, setStartTime] = useState(new Date("2021-10-01"));
  const [stopTime, setStopTime] = useState(new Date());
  const [numNodes, setNumNodes] = useState([1, 192]);

  if (!jobListData) {
    return <div>Loading</div>;
  }

  let elements = [];
  elements.push(
    <JobFilter
      key="jobfilter"
      userId={[userId, setUserId]}
      startTime={[startTime, setStartTime]}
      stopTime={[stopTime, setStopTime]}
      numNodes={[numNodes, setNumNodes]}
    />
  );
  elements.push(
    <JobList
      key="joblist"
      jobs={jobListData.Jobs}
      displayMetrics={jobListData.DisplayMetrics}
      filter={(job) =>
        job.UserId.startsWith(userId) &&
        checkBetween(startTime, stopTime, new Date(job.StartTime * 1000)) &&
        checkBetween(numNodes[0], numNodes[1], job.NumNodes)
      }
    />
  );

  return <React.Fragment>{elements}</React.Fragment>;
};

export const useGetJobs = () => {
  const [jobListData, setJobs] = useState<JobListData>();
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/jobs").then((res) =>
      res.json().then((data) => setJobs(data))
    );
  }, []);
  return jobListData;
};

export default Jobs;
