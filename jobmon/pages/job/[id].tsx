import type { NextPage } from "next";
import React, { useMemo } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { JobData, JobMetadata } from "../../types/job";
import MetricDataCharts from "../../components/jobview/MetricDataCharts";
import { useRouter } from "next/router";
import QuantileDataCharts from "../../components/jobview/QuantileDataCharts";
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
import {
  AnalysisBoxPlot,
  AnalysisTableView,
} from "../../components/jobview/AnalysisView";
import { SelectionMap } from "../../types/helpers";
import { useStorageState } from "./../../utils/utils";
import { JobTag } from "./../../types/job";

const Job: NextPage = () => {
  const router = useRouter();
  const jobId = router.query["id"];
  const [sampleInterval, setSampleInterval] = useState<number>();
  const [selection, setSelection] = useState<SelectionMap>({});
  const selected = Object.keys(selection).filter((val) => selection[val]);
  const node = selected.length === 1 ? selected[0] : undefined;
  const [data, isLoading] = useGetJobData(
    parseInt(jobId as string),
    node,
    sampleInterval
  );
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [stopTime, setStopTime] = useState<Date>(new Date());
  const [showQuantiles, setShowQuantiles] = useState(true);
  const [autoScale, setAutoscale] = useState(true);
  const setTimeRange = (start: Date, end: Date) => {
    setStartTime(start);
    setStopTime(end);
  };
  const [selectedMetrics, setSelectedMetrics] = useMetricSelection(data);

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
    if (data?.SampleInterval) {
      setSampleInterval(data.SampleInterval);
    }
  }, [data]);

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
          jobdata={data}
          setStartTime={setStartTime}
          setStopTime={setStopTime}
          startTime={startTime}
          stopTime={stopTime}
          showQuantiles={showQuantiles}
          setShowQuantiles={setShowQuantiles}
          autoScale={autoScale}
          setAutoScale={setAutoscale}
          sampleInterval={sampleInterval}
          sampleIntervals={data.SampleIntervals}
          setSampleInterval={setSampleInterval}
          selectedMetrics={selectedMetrics}
          setSelectedMetrics={setSelectedMetrics}
        />
      </Grid>
      <Tabs isLazy>
        <TabList>
          <Tab>Timeline</Tab>
          <Tab>Box Plots</Tab>
          <Tab>Node Table</Tab>
          {/* <Tab>Roofline</Tab> */}
        </TabList>

        <TabPanels>
          {/* <TabPanel>{generateChartsMemo}</TabPanel> */}
          <TabPanel>
            {showQuantiles ? (
              <QuantileDataCharts
                key="quantile-charts"
                quantiles={data?.QuantileData.filter((m) =>
                  selectedMetrics.includes(m.Config.Measurement)
                )}
                startTime={startTime}
                stopTime={stopTime}
                setTimeRange={setTimeRange}
                isLoading={isLoading}
                autoScale={autoScale}
              />
            ) : (
              <MetricDataCharts
                key="metric-charts"
                metrics={data?.MetricData.filter((m) =>
                  selectedMetrics.includes(m.Config.Measurement)
                )}
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
            <AnalysisBoxPlot
              data={data}
              autoScale={autoScale}
            ></AnalysisBoxPlot>
          </TabPanel>
          <TabPanel>
            <AnalysisTableView data={data}></AnalysisTableView>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
export default Job;

export const useGetJobData: (
  id: number | undefined,
  node?: string,
  sampleInterval?: number
) => [JobData | undefined, boolean] = (
  id: number | undefined,
  node?: string,
  sampleInterval?: number
) => {
  const [jobData, setJobData] = useState<JobData>();
  const [isLoading, setIsLoading] = useState(true);
  const [jobCache, setJobCache] = useState<{ [key: string]: JobData }>({});
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  useEffect(() => {
    if (!id) {
      return;
    }
    let url = new URL(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/job/${id}`);
    if (sampleInterval) {
      url.searchParams.append("sampleInterval", sampleInterval.toString());
    }
    if (node && node != "" && !node.includes("|")) {
      const key = (sampleInterval?.toString() ?? "") + node;
      url.searchParams.append("node", node);
      if (key in jobCache) {
        setJobData(jobCache[key]);
        setIsLoading(false);
        return;
      }
    }
    const key = (sampleInterval?.toString() ?? "") + "all";
    if (!node && key in jobCache) {
      setJobData(jobCache[key]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch(url.toString(), { credentials: "include" }).then((res) => {
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        removeCookie("Authorization");
      } else {
        res.json().then((data: JobData) => {
          setJobCache((prevState) => {
            let key = node;
            if (data.Metadata.NumNodes === 1) {
              key = data.Metadata.NodeList;
            }
            prevState[
              key
                ? data.SampleInterval.toString() + key
                : (data.SampleInterval.toString() ?? "") + "all"
            ] = data;
            return prevState;
          });
          setJobData(data);
          setIsLoading(false);
        });
      }
    });
  }, [id, node, jobCache, removeCookie, sampleInterval]);
  return [jobData, isLoading];
};

interface PartitionMetricSelection {
  [key: string]: string[];
}

const useMetricSelection = (
  job: JobData | undefined
): [string[], (val: string[]) => void] => {
  const [selectedMetricsMap, setSelectedMetricsMap] =
    useStorageState<PartitionMetricSelection>("selected-metrics", {});
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  useEffect(() => {
    if (job && job.Metadata) {
      const partition = job.Metadata.Partition;
      if (partition in selectedMetricsMap) {
        setSelectedMetrics(selectedMetricsMap[partition]);
      } else {
        const newMap = { ...selectedMetricsMap };
        newMap[partition] = job.MetricData.map((val) => val.Config.Measurement);
        setSelectedMetrics(newMap[partition]);
        setSelectedMetricsMap(newMap);
      }
    }
  }, [job, selectedMetricsMap, setSelectedMetricsMap]);

  const setSelection = (val: string[]) => {
    if (job && job.Metadata) {
      const newMap = { ...selectedMetricsMap };
      newMap[job.Metadata.Partition] = val;
      setSelectedMetricsMap(newMap);
    }
  };

  return [selectedMetrics, setSelection];
};
