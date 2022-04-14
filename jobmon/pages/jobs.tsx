import React, { useEffect, useRef, useState } from "react";
import JobFilter from "../components/joblist/job-filter/JobFilter";
import JobList from "../components/joblist/JobList";
import { checkBetween, useGetJobs, useStorageState } from "../utils/utils";
import { JobMetadata } from "./../types/job";
import { useRouter } from "next/router";
import { Box, Center, Spinner } from "@chakra-ui/react";
import JoblistPageSelection from "../components/joblist/JoblistPageSelection";

export const Jobs = () => {
  const router = useRouter();
  const jobListData = useGetJobs();
  const [userName, setUserId] = useStorageState("username", "");
  const [startTime, setStartTime] = useState(new Date("2021-10-01"));
  const [stopTime, setStopTime] = useState(new Date());
  const [numNodes, setNumNodes] = useStorageState("numNodes", [1, 192]);
  const [partition, setPartition] = useStorageState("partition", "");
  const [numGpu, setNumGpu] = useStorageState("numGpu", [0, 224]);
  const [showIsRunning, setShowIsRunning] = useStorageState(
    "showIsRunning",
    true
  );
  const [joblistLimit, setJoblistLimit] = useStorageState("joblistLimit", 25);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useStorageState("sortyBy", "StartTime");
  const [sortByDescending, setSortByDescending] = useState(true);

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
  let filteredJobs = jobListData?.Jobs?.filter(filter) ?? [];

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
      partitions={[Array.from(partitions), partition, setPartition]}
      numGpu={[numGpu, setNumGpu]}
      isRunning={[showIsRunning, setShowIsRunning]}
      joblistLimit={[joblistLimit, setJoblistLimit]}
      sortBy={[sortBy, setSortBy]}
      sortByDescending={[sortByDescending, setSortByDescending]}
    />
  );

  if (sortBy !== "joblength") {
    filteredJobs.sort((a, b) =>
      a[sortBy as keyof JobMetadata] < b[sortBy as keyof JobMetadata] ? 1 : -1
    );
    if (!sortByDescending) {
      filteredJobs.reverse();
    }
  } else {
    filteredJobs.sort((a, b) => {
      if (!a.IsRunning && !b.IsRunning) {
        return -(
          Math.abs(a.StopTime - a.StartTime) -
          Math.abs(b.StopTime - b.StartTime)
        );
      }
      if (a.IsRunning && !b.IsRunning) {
        return -1;
      }
      if (b.IsRunning && !a.IsRunning) {
        return 1;
      }
      return a.StartTime < b.StartTime ? 1 : -1;
    });
    const running = filteredJobs.filter((j) => j.IsRunning);
    const finished = filteredJobs.filter((j) => !j.IsRunning);
    if (!sortByDescending) {
      finished.reverse();
    }
    filteredJobs = [...finished, ...running];
  }

  elements.push(
    <Box ref={joblistRef}>
      <JobList
        key="joblist"
        jobs={filteredJobs}
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

export default Jobs;
