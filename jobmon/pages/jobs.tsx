import React, { useEffect, useRef, useState } from "react";
import JobFilter from "../components/joblist/JobFilter";
import JobList from "../components/joblist/JobList";
import { checkBetween, useStorageState } from "../utils/utils";
import { JobListData, JobMetadata } from "./../types/job";
import { useRouter } from "next/router";
import { useCookies } from "react-cookie";
import { Box, Center, Spinner } from "@chakra-ui/react";
import { SelectionMap } from "./job/[id]";
import JoblistPageSelection from "../components/joblist/JoblistPageSelection";

export const Jobs = () => {
  const router = useRouter();
  const jobListData = useGetJobs();
  const [userName, setUserId] = useStorageState("username", "");
  const [startTime, setStartTime] = useStorageState(
    "startTime",
    new Date("2021-10-01")
  );
  const [stopTime, setStopTime] = useStorageState("stopTime", new Date());
  const [numNodes, setNumNodes] = useStorageState("numNodes", [1, 192]);
  const [metrics, setMetrics] = useStorageState<SelectionMap>("metrics", {});
  const [partition, setPartition] = useStorageState("partition", "");
  const [numGpu, setNumGpu] = useStorageState("numGpu", [0, 224]);
  const [showIsRunning, setShowIsRunning] = useStorageState(
    "showIsRunning",
    true
  );
  const [joblistLimit, setJoblistLimit] = useStorageState("joblistLimit", 25);
  const [page, setPage] = useState(1);
  const joblistRef = useRef<HTMLDivElement>(null);

  const filter = (job: JobMetadata) =>
    job.UserName.startsWith(userName) &&
    checkBetween(
      new Date(startTime),
      new Date(stopTime),
      new Date(job.StartTime * 1000)
    ) &&
    checkBetween(numNodes[0], numNodes[1], job.NumNodes) &&
    (partition === "" ? true : partition === job.Partition) &&
    checkBetween(numGpu[0], numGpu[1], job.GPUsPerNode * job.NumNodes) &&
    (!job.IsRunning || showIsRunning);
  const filteredJobs = jobListData?.Jobs?.filter(filter) ?? [];

  useEffect(() => {
    const { user } = router.query;
    if (user?.length ?? 0 > 0) {
      setUserId(user as string);
    }
  }, [router]);

  useEffect(() => {
    setPage(1);
  }, [joblistLimit, filteredJobs?.length]);

  useEffect(() => {
    if (joblistRef.current) {
      joblistRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [page]);

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

  let partitions = new Set<string>();
  jobListData.Jobs.forEach((j) =>
    j.Partition !== "" ? partitions.add(j.Partition) : null
  );
  let elements = [];
  elements.push(
    <JobFilter
      key="jobfilter"
      userName={[userName, setUserId]}
      startTime={[new Date(startTime), setStartTime]}
      stopTime={[new Date(stopTime), setStopTime]}
      numNodes={[numNodes, setNumNodes]}
      metrics={[metrics, setChecked]}
      partitions={[Array.from(partitions), partition, setPartition]}
      numGpu={[numGpu, setNumGpu]}
      isRunning={[showIsRunning, setShowIsRunning]}
      joblistLimit={[joblistLimit, setJoblistLimit]}
    />
  );

  const displayMetrics = Object.keys(metrics).filter((val) => metrics[val]);

  elements.push(
    <Box ref={joblistRef}>
      <JobList
        key="joblist"
        jobs={filteredJobs}
        displayMetrics={displayMetrics}
        radarChartMetrics={jobListData.Config.RadarChartMetrics}
        limit={joblistLimit}
        page={page}
      />
    </Box>
  );

  const pages = filteredJobs.length / joblistLimit;
  elements.push(
    <JoblistPageSelection
      key="pageselection"
      currentPage={page}
      pages={!isNaN(pages) && isFinite(pages) ? Math.ceil(pages) : 1}
      setPage={setPage}
    ></JoblistPageSelection>
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
