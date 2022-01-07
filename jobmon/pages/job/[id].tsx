import type { NextPage } from "next";
import React, { useMemo } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { JobData } from "../../types/job";
import MetricDataCharts from "../../components/charts/MetricDataCharts";
import { useRouter } from "next/router";
import QuantileDataCharts from "../../components/charts/QuantileDataCharts";
import Control from "../../components/jobview/ViewControl";
import {
  Box,
  Center,
  Grid,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import { JobInfo } from "../../components/jobview/JobInfo";
import { useCookies } from "react-cookie";
import AnalysisPlots from "../../components/jobview/AnalysisView";

export type SelectionMap = { [key: string]: boolean };

const Job: NextPage = () => {
  const router = useRouter();
  const jobId = router.query["id"];
  const [selection, setSelection] = useState<SelectionMap>({});
  const selected = Object.keys(selection).filter((val) => selection[val]);
  const node = selected.length === 1 ? selected[0] : undefined;
  const [data, isLoading] = useGetJobData(parseInt(jobId as string), node);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [stopTime, setStopTime] = useState<Date>(new Date());
  const [showQuantiles, setShowQuantiles] = useState(true);
  const [autoScale, setAutoscale] = useState(true);
  const setTimeRange = (start: Date, end: Date) => {
    setStartTime(start);
    setStopTime(end);
  };

  useEffect(() => {
    if (data?.Metadata.NodeList !== undefined) {
      let allHostSelection: SelectionMap = {};
      const nodes = data.Metadata.NodeList.split("|");
      nodes.forEach((val) => {
        allHostSelection[val] = true;
      });
      setSelection(allHostSelection);
      if (data.Metadata.NumNodes === 1) {
        setShowQuantiles(false);
      }
    }
  }, [data?.Metadata.NodeList, data?.Metadata.NumNodes]);

  useEffect(() => {
    if (data?.Metadata.StartTime) {
      setStartTime(new Date(data?.Metadata.StartTime * 1000));
    }
  }, [data?.Metadata.StartTime]);

  useEffect(() => {
    if (data?.Metadata.StopTime) {
      setStopTime(new Date(data?.Metadata.StopTime * 1000));
    }
  }, [data?.Metadata.StopTime]);

  if (!data) {
    return (
      <Center>
        <Spinner size="xl" />
      </Center>
    );
  }

  const setChecked = (val: SelectionMap) => {
    const newSelection = { ...selection };
    Object.keys(val).forEach((key) => {
      if (key === "all") {
        Object.keys(newSelection).forEach((k) => (newSelection[k] = val[key]));
      } else if (key in selection) {
        newSelection[key] = val[key];
      }
      if (selection !== newSelection) {
        setSelection(newSelection);
      }
    });
  };

  return (
    <Box m={5}>
      <Grid
        mb={3}
        p={2}
        border="1px"
        borderRadius="10px"
        templateColumns="repeat(2, 1fr)"
      >
        <JobInfo
          metadata={data.Metadata}
          setChecked={setChecked}
          nodes={selection}
        />
        <Control
          metadata={data.Metadata}
          setStartTime={setStartTime}
          setStopTime={setStopTime}
          startTime={startTime}
          stopTime={stopTime}
          showQuantiles={showQuantiles}
          setShowQuantiles={setShowQuantiles}
          autoScale={autoScale}
          setAutoScale={setAutoscale}
        />
      </Grid>
      <Tabs isLazy>
        <TabList>
          <Tab>Timeline</Tab>
          <Tab>Analysis</Tab>
        </TabList>

        <TabPanels>
          {/* <TabPanel>{generateChartsMemo}</TabPanel> */}
          <TabPanel>
            {showQuantiles ? (
              <QuantileDataCharts
                key="quantile-charts"
                quantiles={data?.QuantileData}
                startTime={startTime}
                stopTime={stopTime}
                setTimeRange={setTimeRange}
                isLoading={isLoading}
                autoScale={autoScale}
              />
            ) : (
              <MetricDataCharts
                key="metric-charts"
                metrics={data?.MetricData}
                nodeSelection={selected}
                startTime={startTime}
                stopTime={stopTime}
                setTimeRange={setTimeRange}
                isLoading={isLoading}
                autoScale={autoScale}
              />
            )}
          </TabPanel>
          <TabPanel>
            <AnalysisPlots data={data} autoScale={autoScale}></AnalysisPlots>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
export default Job;

export const useGetJobData: (
  id: number | undefined,
  node?: string
) => [JobData | undefined, boolean] = (
  id: number | undefined,
  node?: string
) => {
  const [jobData, setJobData] = useState<JobData>();
  const [isLoading, setIsLoading] = useState(true);
  const [jobCache, setJobCache] = useState<{ [key: string]: JobData }>({});
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  useEffect(() => {
    if (!id) {
      return;
    }
    let URL = process.env.NEXT_PUBLIC_BACKEND_URL + `/api/job/${id}`;
    if (node && node != "" && !node.includes("|")) {
      URL += `?node=${node}`;
      if (node in jobCache) {
        setJobData(jobCache[node]);
        setIsLoading(false);
        return;
      }
    }
    if (!node && "all" in jobCache) {
      setJobData(jobCache["all"]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch(URL, { credentials: "include" }).then((res) => {
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        removeCookie("Authorization");
      } else {
        res.json().then((data: JobData) => {
          setJobCache((prevState) => {
            let key = node;
            if (data.Metadata.NumNodes === 1) {
              key = data.Metadata.NodeList;
            }
            prevState[key ? key : "all"] = data;
            return prevState;
          });
          setJobData(data);
          setIsLoading(false);
        });
      }
    });
  }, [id, node, jobCache, removeCookie]);
  return [jobData, isLoading];
};
