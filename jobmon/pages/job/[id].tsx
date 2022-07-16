import type { NextPage } from "next";
import React, { useMemo } from "react";
import { useEffect } from "react";
import { useState } from "react";
import {
  JobData,
  JobMetadata,
  MetricData,
  WSLoadMetricsResponse,
  WSMsg,
  WSMsgType,
} from "../../types/job";
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
import { AnalysisBoxPlot } from "../../components/jobview/AnalysisView";
import { SelectionMap } from "../../types/helpers";
import { clamp, useStorageState } from "./../../utils/utils";
import { WSLoadMetricsMsg } from "./../../types/job";

const Job: NextPage = () => {
  const router = useRouter();
  const jobId = router.query["id"];
  const [sampleInterval, setSampleInterval] = useState<number>();
  const [selection, setSelection] = useState<SelectionMap>({});
  const selected = Object.keys(selection).filter((val) => selection[val]);
  const node =
    selected.length === 1 && Object.keys(selection).length > 1
      ? selected[0]
      : undefined;
  const [startTime, setStartTime] = useState<Date>();
  const [stopTime, setStopTime] = useState<Date>();
  const [data, isLoading] = useGetJobData(
    parseInt(jobId as string),
    node,
    sampleInterval,
    startTime?.getTime()
  );
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
  }, [data?.SampleInterval]);

  useEffect(() => {
    if (data?.Metadata.StartTime) {
      if (data.Metadata.IsRunning) {
        setStartTime(
          new Date(
            Math.max(
              new Date().getTime() - 3600 * 1000,
              data.Metadata.StartTime * 1000
            )
          )
        );
      } else {
        setStartTime(new Date(data?.Metadata.StartTime * 1000));
      }
    }
  }, [data?.Metadata.StartTime, data?.Metadata.IsRunning]);

  useEffect(() => {
    if (data?.Metadata.StopTime && !data?.Metadata.IsRunning) {
      setStopTime(new Date(data?.Metadata.StopTime * 1000));
    }
    if (data?.Metadata.IsRunning) {
      setStopTime(new Date());
    }
  }, [data?.Metadata.StopTime, data?.Metadata.IsRunning, data]);

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
          // showTimeControl={!data.Metadata.IsRunning || liveLoadAll}
          setStartTime={setStartTime}
          setStopTime={setStopTime}
          startTime={startTime}
          stopTime={stopTime}
          showQuantiles={showQuantiles}
          setShowQuantiles={
            !data.Metadata.IsRunning ? setShowQuantiles : undefined
          }
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
          {/* <Tab>Box Plots</Tab> */}
          {/* <Tab>Node Table</Tab> */}
          {/* <Tab>Roofline</Tab> */}
        </TabList>

        <TabPanels>
          <TabPanel>
            {showQuantiles && data?.QuantileData?.length > 0 ? (
              <QuantileDataCharts
                key="quantile-charts"
                quantiles={data?.QuantileData?.filter((m) =>
                  selectedMetrics.includes(m.Config.Measurement)
                )}
                startTime={startTime}
                stopTime={stopTime}
                setTimeRange={
                  data.Metadata.IsRunning ? undefined : setTimeRange
                }
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
                setTimeRange={
                  data.Metadata.IsRunning ? undefined : setTimeRange
                }
                isLoading={isLoading}
                autoScale={autoScale}
                isRunning={data.Metadata.IsRunning}
              />
            )}
          </TabPanel>
          {/* <TabPanel>
            <AnalysisBoxPlot
              data={data}
              autoScale={autoScale}
            ></AnalysisBoxPlot>
          </TabPanel> */}
          {/* <TabPanel>
            <AnalysisTableView data={data}></AnalysisTableView>
          </TabPanel> */}
        </TabPanels>
      </Tabs>
    </Box>
  );
};
export default Job;

export const useGetJobData: (
  id: number | undefined,
  node?: string,
  sampleInterval?: number,
  timeStart?: number
) => [JobData | undefined, boolean] = (
  id: number | undefined,
  node?: string,
  sampleInterval?: number,
  timeStart?: number
) => {
  const [jobData, setJobData] = useState<JobData>();
  const [isLoading, setIsLoading] = useState(true);
  const [jobCache, setJobCache] = useState<{ [key: string]: JobData }>({});
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  const [curLiveWindowStart, setCurLiveWindowStart] = useState(Infinity);
  const [ws, setWs] = useState<WebSocket>();
  useEffect(() => {
    if (!id) {
      return;
    }
    let url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/job/${id}`
    );
    if (sampleInterval) {
      url.searchParams.append("sampleInterval", sampleInterval.toString());
    }
    if (node && node != "" && !node.includes("|")) {
      url.searchParams.append("node", node);
    }
    if (url.search in jobCache) {
      setIsLoading(false);
      setJobData(jobCache[url.search]);
      return;
    }
    setIsLoading(true);
    fetch(url.toString(), { credentials: "include" }).then((res) => {
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        removeCookie("Authorization");
      } else {
        res.json().then((data: JobData) => {
          if (!data.Metadata.IsRunning) {
            setJobCache((prevState) => {
              if (sampleInterval === undefined) {
                url.searchParams.append(
                  "sampleInterval",
                  data.SampleInterval.toString()
                );
              }
              prevState[url.search] = data;
              return prevState;
            });
          }
          setJobData(data);
          setIsLoading(false);
        });
      }
    });
  }, [id, node, jobCache, removeCookie, sampleInterval]);

  useEffect(() => {
    if (jobData?.Metadata.IsRunning) {
      const url = new URL(
        "ws://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/live/${id}`
      );
      const ws = new WebSocket(url);
      ws.onmessage = (msg) => {
        const newJobData = { ...jobData };
        const data = JSON.parse(msg.data) as WSMsg;
        if (
          data.Type === WSMsgType.LoadMetricsResponse ||
          data.Type === WSMsgType.LatestMetrics
        ) {
          for (const metric of (data as WSLoadMetricsResponse).MetricData) {
            const idx = newJobData.MetricData.findIndex(
              (d) => d.Config.Measurement === metric.Config.Measurement
            );
            if (idx !== -1) {
              Object.keys(metric.Data).forEach((key) => {
                if (data.Type === WSMsgType.LatestMetrics) {
                  newJobData.MetricData[idx].Data[key].push(
                    ...metric.Data[key]
                  );
                } else {
                  newJobData.MetricData[idx].Data[key] = metric.Data[
                    key
                  ].concat(newJobData.MetricData[idx].Data[key]);
                }
              });
            }
          }
          setJobData(newJobData);
        }
      };
      window.onbeforeunload = () => {
        ws.onclose = () => {};
        ws.close();
      };
      setWs(ws);
      return () => {
        ws.close();
        setWs(undefined);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobData?.Metadata.IsRunning, id]);

  useEffect(() => {
    if (curLiveWindowStart === Infinity && timeStart) {
      setCurLiveWindowStart(timeStart);
    }
  }, [timeStart, curLiveWindowStart]);

  useEffect(() => {
    if (ws && ws.readyState === ws.OPEN) {
      if (timeStart && timeStart < curLiveWindowStart) {
        let msg: WSLoadMetricsMsg = {
          StartTime: Math.round(timeStart / 1000),
          StopTime: Math.round(curLiveWindowStart / 1000),
          Type: WSMsgType.LoadMetrics,
        };
        setCurLiveWindowStart(timeStart);
        ws.send(JSON.stringify(msg));
      }
    }
  }, [ws, timeStart, curLiveWindowStart]);

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
