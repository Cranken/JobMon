import React, { useEffect, useRef, useState } from "react";
import JobFilter from "@/components/joblist/job-filter/JobFilter";
import JobList from "@/components/joblist/JobList";
import { dateToUnix, useGetJobs, useStorageState, useSessionStorageState, useIsWideDevice, clamp } from "@/utils/utils";
import { JobSearchParams, JobMetadata, JobTag } from "../types/job";
import { useRouter } from "next/router";
import { Box, Center, Divider, Stack } from "@chakra-ui/react";
import { JobListDisplaySettings } from "@/components/joblist/JobListDisplaySettings";
import CentredSpinner from "@/components/utils/CentredSpinner";
import PageSelection from "@/components/utils/PageSelection";

export const Jobs = () => {
  const router = useRouter();
  const [joblistLimit, setJoblistLimit] = useStorageState("joblistLimit", 25);
  const [sortBy, setSortBy] = useStorageState("sortyBy", "StartTime");
  const [sortByDescending, setSortByDescending] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [page, setPageStorage, , pageIsLoading] = useSessionStorageState("jobsPage", 1)
  const isWideDevice = useIsWideDevice();

  const [params, setParams, , isLoadingParams] =
    useStorageState<JobSearchParams>("joblistParams", {
      Partition: "",
      NumGpus: [0, 224],
      NumNodes: [1, 192],
    });
  const [jobListData] = useGetJobs(
    isLoadingParams ? undefined : params
  );
  const joblistRef = useRef<HTMLDivElement>(null);

  let mutableJobs = jobListData?.Jobs ?? [];

  useEffect(() => {
    if (!isLoadingParams) {
      setParams({
        ...params,
        Time: [
          dateToUnix(
            new Date(Math.floor(Date.now()) - 60 * 60 * 24 * 14 * 1000)
          ),
          dateToUnix(new Date()),
        ],
      });
    }
  }, [isLoadingParams]);

  useEffect(() => {
    const { user } = router.query;
    if (user?.length ?? 0 > 0) {
      setParams({ ...params, UserName: user as string });
    }
  }, [router]);

  useEffect(() => {
    const { tag } = router.query;
    if (jobListData && (tag?.length ?? 0 > 0)) {
      const tagListFiltered = jobListData.Config.Tags.filter((value: JobTag) => value.Name == tag)
      if (tagListFiltered.length > 0) {
      setParams({ ...params, Tags: tagListFiltered });
      }
    }
  }, [router, jobListData]);

  useEffect(() => {
    if (joblistRef.current) {
      joblistRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [page]);

  if (!jobListData || pageIsLoading) {
    return (
      <CentredSpinner />
    );
  }

  const elements = [];
  elements.push(
    <Center key="list-control">
      <Stack
        borderWidth="1px"
        borderRadius="lg"
        p={5}
        margin={4}
        w={{
          base: "97%",
          md: "70%",
          lg: "85%",
          xl: "70%",
          '2xl': "60%",
          '4xl': "50%"
        }}
      >
        <JobFilter
          key="jobfilter"
          params={params}
          setParams={setParams}
          partitions={Object.keys(jobListData.Config.Partitions)}
          tags={jobListData.Config.Tags}
          mustApply
        />
        <Divider></Divider>
        <JobListDisplaySettings
          key="display-settings"
          joblistLimit={[joblistLimit, setJoblistLimit]}
          sortBy={[sortBy, setSortBy]}
          sortByDescending={[sortByDescending, setSortByDescending]}
          compactView={[compactView, setCompactView]}
        ></JobListDisplaySettings>
      </Stack>
    </Center>
  );

  if (sortBy !== "joblength") {
    mutableJobs.sort((a, b) =>
      a[sortBy as keyof JobMetadata] < b[sortBy as keyof JobMetadata] ? 1 : -1
    );
    if (!sortByDescending) {
      mutableJobs.reverse();
    }
  } else {
    mutableJobs.sort((a, b) => {
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
      return a.StartTime < b.StartTime ? -1 : 1;
    });
    const running = mutableJobs.filter((j) => j.IsRunning);
    const finished = mutableJobs.filter((j) => !j.IsRunning);
    if (!sortByDescending) {
      finished.reverse();
      running.reverse();
    }
    mutableJobs = [...finished, ...running];
  }



  const pages = mutableJobs.length / joblistLimit;

  // Clamp page if page is to high or low
  if (!isNaN(pages) && isFinite(pages) && (page < 0 || Math.ceil(pages) < page)) {
    setPageStorage(clamp(page, 0, Math.ceil(pages)))
  }

  // Set page to 1. This case is necessary coming from a filter with zero jobs to a filter with more than zero jobs.
  if (page == 0 && pages > 0) {
    setPageStorage(1)
  }

  if (pages > 1) {
    elements.push(
      <PageSelection
        key="pageselection_top"
        currentPage={page}
        pages={!isNaN(pages) && isFinite(pages) ? Math.ceil(pages) : 1}
        setPage={setPageStorage}
        marginBottomEnable={true}
        displayExtendedSelection={isWideDevice}
      ></PageSelection>
    );
  }

  elements.push(
    <Box key="joblist" ref={joblistRef}>
      <JobList
        jobs={mutableJobs}
        radarChartMetrics={jobListData.Config.RadarChartMetrics}
        limit={joblistLimit}
        page={page}
        compactView={compactView}
      />
    </Box>
  );

  if (pages > 1) {
    elements.push(
      <PageSelection
        key="pageselection_end"
        currentPage={page}
        pages={!isNaN(pages) && isFinite(pages) ? Math.ceil(pages) : 1}
        setPage={setPageStorage}
        marginTopEnable={true}
        marginBottomEnable={true}
        displayExtendedSelection={isWideDevice}
      ></PageSelection>
    );
  }

  return <React.Fragment>{elements}</React.Fragment>;
};

export default Jobs;
