import React, { useEffect, useRef, useState } from "react";
import JobFilter from "../components/joblist/job-filter/JobFilter";
import JobList from "../components/joblist/JobList";
import {
  checkBetween,
  dateToUnix,
  useGetJobs,
  useStorageState,
} from "../utils/utils";
import { JobSearchParams, JobMetadata, JobTag } from "./../types/job";
import { useRouter } from "next/router";
import { Box, Center, Divider, Spinner, Stack } from "@chakra-ui/react";
import JoblistPageSelection from "../components/joblist/JoblistPageSelection";
import { JobListDisplaySettings } from "../components/joblist/JobListDisplaySettings";

export const Jobs = () => {
  const router = useRouter();
  const [joblistLimit, setJoblistLimit] = useStorageState("joblistLimit", 25);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useStorageState("sortyBy", "StartTime");
  const [sortByDescending, setSortByDescending] = useState(true);
  const [params, setParams] = useStorageState<JobSearchParams>(
    "joblistParams",
    {
      Partition: "",
      NumGpus: [0, 224],
      NumNodes: [1, 192],
      Time: [
        dateToUnix(new Date(Math.floor(Date.now()) - 60 * 60 * 24 * 14 * 1000)),
        dateToUnix(new Date()),
      ],
    }
  );
  // Workaround to only reload jobs when time range changes
  const [timeParams, setTimeParams] = useState<JobSearchParams>();
  useEffect(() => {
    setTimeParams({ Time: params.Time });
  }, [params.Time]);

  const jobListData = useGetJobs(timeParams);
  const joblistRef = useRef<HTMLDivElement>(null);

  const filter = (job: JobMetadata) =>
    job.UserName.startsWith(params.UserName ?? "") &&
    checkBetween(params.Time?.[0], params.Time?.[1], job.StartTime) &&
    checkBetween(params.NumNodes?.[0], params.NumNodes?.[1], job.NumNodes) &&
    (params.Partition === "" ? true : params.Partition === job.Partition) &&
    checkBetween(
      params.NumGpus?.[0],
      params.NumGpus?.[1],
      job.GPUsPerNode * job.NumNodes
    ) &&
    (!job.IsRunning || params.IsRunning);
  let filteredJobs = jobListData?.Jobs?.filter(filter) ?? [];

  useEffect(() => {
    const { user } = router.query;
    if (user?.length ?? 0 > 0) {
      setParams({ ...params, UserName: user as string });
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

  let elements = [];
  elements.push(
    <Center key="list-control">
      <Stack borderWidth="1px" borderRadius="lg" p={5} margin={4} w="50%">
        <JobFilter
          key="jobfilter"
          params={params}
          setParams={setParams}
          partitions={Object.keys(jobListData.Config.Partitions)}
        />
        <Divider></Divider>
        <JobListDisplaySettings
          key="display-settings"
          joblistLimit={[joblistLimit, setJoblistLimit]}
          sortBy={[sortBy, setSortBy]}
          sortByDescending={[sortByDescending, setSortByDescending]}
        ></JobListDisplaySettings>
      </Stack>
    </Center>
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
    <Box key="joblist" ref={joblistRef}>
      <JobList
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
