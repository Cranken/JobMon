import React, { useState, useEffect } from "react";
import JobFilter from "../components/joblist/JobFilter";
import JobList from "../components/joblist/JobList";
import { checkBetween } from "../utils/utils";
import { JobListData, JobMetadata } from "./../types/job";
import { useRouter } from "next/router";
import { useCookies } from "react-cookie";
import { Center, Spinner } from "@chakra-ui/react";

export const Jobs = () => {
  const router = useRouter();
  const jobListData = useGetJobs();
  const [userId, setUserId] = useState("");
  const [startTime, setStartTime] = useState(new Date("2021-10-01"));
  const [stopTime, setStopTime] = useState(new Date());
  const [numNodes, setNumNodes] = useState([1, 192]);

  useEffect(() => {
    const { user } = router.query;
    if (user?.length ?? 0 > 0) {
      setUserId(user as string);
    }
  }, [router]);

  if (!jobListData) {
    return (
      <Center>
        <Spinner />
      </Center>
    );
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
  const filter = (job: JobMetadata) =>
    job.UserId.startsWith(userId) &&
    checkBetween(startTime, stopTime, new Date(job.StartTime * 1000)) &&
    checkBetween(numNodes[0], numNodes[1], job.NumNodes);

  elements.push(
    <JobList
      key="joblist"
      jobs={jobListData.Jobs.filter(filter)}
      displayMetrics={jobListData.DisplayMetrics}
    />
  );

  return <React.Fragment>{elements}</React.Fragment>;
};

export const useGetJobs = () => {
  const [jobListData, setJobs] = useState<JobListData>();
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/jobs", {
      credentials: "include",
    }).then((res) => {
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        removeCookie("Authorization");
      } else {
        res.json().then((data) => setJobs(data));
      }
    });
  }, [removeCookie]);
  return jobListData;
};

export default Jobs;
