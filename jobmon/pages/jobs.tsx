import React, { useState, useEffect } from "react";
import JobFilter from "../components/joblist/JobFilter";
import JobList from "../components/joblist/JobList";
import { checkBetween } from "../utils/utils";
import { JobListData, JobMetadata } from "./../types/job";
import { useRouter } from "next/router";
import { useCookies } from "react-cookie";
import { Center, Spinner } from "@chakra-ui/react";
import { SelectionMap } from "./job/[id]";

export const Jobs = () => {
  const router = useRouter();
  const jobListData = useGetJobs();
  const [userName, setUserId] = useState("");
  const [startTime, setStartTime] = useState(new Date("2021-10-01"));
  const [stopTime, setStopTime] = useState(new Date());
  const [numNodes, setNumNodes] = useState([1, 192]);
  const [metrics, setMetrics] = useState<SelectionMap>({});
  const [partition, setPartition] = useState("");
  const [numGpu, setNumGpu] = useState([0, 128]);

  useEffect(() => {
    const { user } = router.query;
    if (user?.length ?? 0 > 0) {
      setUserId(user as string);
    }
  }, [router]);

  useEffect(() => {
    let newMetrics: SelectionMap = {};
    jobListData?.Config.Metrics.forEach((val) => (newMetrics[val] = false));
    const savedMetrics = localStorage.getItem("displayMetrics")?.split(",");
    if (savedMetrics) {
      savedMetrics.forEach((val) => (newMetrics[val] = true));
    }
    setMetrics(newMetrics);
  }, [jobListData]);

  if (!jobListData) {
    return (
      <Center>
        <Spinner />
      </Center>
    );
  }

  const setChecked = (val: SelectionMap) => {
    const newMetrics = { ...metrics };
    Object.keys(val).forEach((key) => {
      if (key in metrics) {
        newMetrics[key] = val[key];
      }
      if (metrics !== newMetrics) {
        setMetrics(newMetrics);
      }
    });
    const selected = Object.keys(newMetrics).filter((val) => newMetrics[val]);
    localStorage.setItem("displayMetrics", selected.join(","));
  };

  let elements = [];
  elements.push(
    <JobFilter
      key="jobfilter"
      userName={[userName, setUserId]}
      startTime={[startTime, setStartTime]}
      stopTime={[stopTime, setStopTime]}
      numNodes={[numNodes, setNumNodes]}
      metrics={[metrics, setChecked]}
      partitions={[jobListData.Config.Partitions, partition, setPartition]}
      numGpu={[numGpu, setNumGpu]}
    />
  );
  const filter = (job: JobMetadata) =>
    job.UserName.startsWith(userName) &&
    checkBetween(startTime, stopTime, new Date(job.StartTime * 1000)) &&
    checkBetween(numNodes[0], numNodes[1], job.NumNodes) &&
    (partition === "" ? true : partition === job.Partition) &&
    checkBetween(numGpu[0], numGpu[1], job.GPUsPerNode * job.NumNodes);

  const displayMetrics = Object.keys(metrics).filter((val) => metrics[val]);

  elements.push(
    <JobList
      key="joblist"
      jobs={jobListData.Jobs.filter(filter)}
      displayMetrics={displayMetrics}
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
