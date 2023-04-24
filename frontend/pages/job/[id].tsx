import type { NextPage } from "next";
import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import {
  AggFn,
  JobData,
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
import { SelectionMap } from "../../types/helpers";
import { useStorageState } from "../../utils/utils";
import { WSLoadMetricsMsg } from "../../types/job";
import { authFetch } from "../../utils/auth";

const Job: NextPage = () => {
  const router = useRouter();
  const jobId = router.query["id"];
  const [sampleInterval, setSampleInterval] = useState<number>();
  const [selection, setSelection] = useState<SelectionMap>();
  const selected = selection ? Object.keys(selection).filter((val) => selection[val]) : [];
  const node =
    selected.length === 1 && Object.keys(selection ?? []).length > 1
      ? selected[0]
      : undefined;
  const [startTime, setStartTime] = useState<Date>();
  const [stopTime, setStopTime] = useState<Date>();
  const [aggFnSelection, setAggFnSelection] = useState<Map<string, AggFn>>();
  const [data, isLoading] = useGetJobData(
    parseInt(jobId as string),
    node,
    sampleInterval,
    aggFnSelection,
    startTime?.getTime(),
  );
  const [showQuantiles, setShowQuantiles] = useState(false);
  const [autoScale, setAutoscale] = useState(true);
  const setTimeRange = (start: Date, end: Date) => {
    setStartTime(start);
    setStopTime(end);
  };
  const [selectedMetrics, setSelectedMetrics] = useMetricSelection(data);

  useEffect(() => {
    if (data?.Metadata.NodeList !== undefined) {
      const allHostSelection: SelectionMap = {};
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

  useEffect(() => {
    if (data && data.MetricData) {
      if (!aggFnSelection) {
        const selection = new Map<string, AggFn>();
        data.MetricData.forEach((m) => selection.set(m.Config.GUID, m.Config.AggFn));
        setAggFnSelection(selection);
      }
    }
  }, [data?.Metadata]);

  if (!data) {
    return (
      <Center>
        <Spinner size="xl" />
      </Center>
    );
  }

  const setChecked = (val: SelectionMap) => {
    if (!selection) {
      return;
    }
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
  const filteredMetricData = data.MetricData?.filter((m) =>
    selectedMetrics.includes(m.Config.Measurement)
  ) ?? [];
  const filteredQuantileData = data.QuantileData?.filter((m) =>
    selectedMetrics.includes(m.Config.Measurement)
  ) ?? [];
  const categories = Array.from(new Set(filteredMetricData.flatMap((m) => m.Config.Categories))).sort((a, b) => a < b ? -1 : 1);
  const metricGroups = categories.map((c) => filteredMetricData.filter((v) => v.Config.Categories.includes(c)));
  const quantileGroups = categories.map((c) => filteredQuantileData.filter((v) => v.Config.Categories.includes(c)));

  const cps: ChangePoint[] = data.Metadata.Data.filter((x) => {
    return x.ChangePoints.length != 0
  }).map((x) => {
    const cp: ChangePoint = {
      guid: x.Config.GUID,
      date: x.ChangePoints.map((d) => new Date(d))
    }
    return cp
  })

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
          nodes={selection ?? {}}
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
          {categories.map((c) => <Tab key={c}>{c}</Tab>)}
        </TabList>

        <TabPanels>
          {showQuantiles && data?.QuantileData?.length > 0 ?
            quantileGroups.map((g, i) =>
              <TabPanel key={`quantile-${i}`}>
                <QuantileDataCharts
                  key="quantile-charts"
                  quantiles={g}
                  startTime={startTime}
                  stopTime={stopTime}
                  setTimeRange={
                    data.Metadata.IsRunning ? undefined : setTimeRange
                  }
                  isLoading={isLoading}
                  autoScale={autoScale}
                  showCP={true}
                  changepoints={cps}
                />
              </TabPanel>
            ) :
            metricGroups.map((g, i) =>
              <TabPanel key={`metric-${i}`}>
                <MetricDataCharts
                  key="metric-charts"
                  metrics={g}
                  nodeSelection={selected}
                  startTime={startTime}
                  stopTime={stopTime}
                  setTimeRange={
                    data.Metadata.IsRunning ? undefined : setTimeRange
                  }
                  isLoading={isLoading}
                  autoScale={autoScale}
                  isRunning={data.Metadata.IsRunning}
                  aggFnSelection={selected.length !== 1 ? aggFnSelection : undefined}
                  setAggFnSelection={(m, fn) => setAggFnSelection((prevState) => {
                    const copy = new Map(prevState);
                    copy.set(m, fn);
                    return copy;
                  })}
                  showCP={true}
                  changepoints={cps}
                />
              </TabPanel>
            )
          }
        </TabPanels>
      </Tabs>
    </Box >
  );
};
export default Job;

export interface ChangePoint {
  guid: string;
  date: Date[];
}

interface JobCache {
  Metadata: Omit<JobData, "MetricData"> | undefined;
  [sampleInterval: number]: MetricData[];
}

interface NodeCache {
  [sampleInterval: number]: {
    [key: string]: JobData;
  };
}

interface AggCache {
  [sampleInterval: number]: {
    [metric: string]: {
      [aggFn: string]: MetricData;
    };
  };
}

/** 
 * Gets the job data for the provided ID.
 * Implements caching for the data
 * 
 * The caching strategy follows the provided optional parameters:
 * 
 * If a node is selected: 
 * Always return the detailed node data.
 * 
 * Otherwise: Return the data for the provided sampleinterval and overwrite
 * the metrics with a non-default aggFn provided by the aggFnSelection
 */
export const useGetJobData: (
  id: number | undefined,
  node?: string,
  sampleInterval?: number,
  aggFnSelection?: Map<string, AggFn>,
  timeStart?: number
) => [JobData | undefined, boolean] = (
  id: number | undefined,
  node?: string,
  sampleInterval?: number,
  aggFnSelection?: Map<string, AggFn>,
  timeStart?: number
) => {
    const [jobData, setJobData] = useState<JobData>();
    const [isLoading, setIsLoading] = useState(true);
    const [jobCache, setJobCache] = useState<JobCache>({ Metadata: undefined });
    const [nodeCache, setNodeCache] = useState<NodeCache>();
    const [curLiveWindowStart, setCurLiveWindowStart] = useState(Infinity);
    const [ws, setWs] = useState<WebSocket>();
    const [lastMessage, setLastMessage] = useState<WSMsg>({} as WSMsg);
    const [aggFnCache, setAggFnCache] = useState<AggCache>({});

    const populateJobCache = (data: JobData) => {
      setJobCache((prevState) => {
        const newState = prevState;
        if (!newState.Metadata) {
          newState.Metadata = data;
        }
        newState[data.SampleInterval] = data.MetricData;
        setAggFnCache((aggState) => {
          data.MetricData.forEach((m) => {
            if (!(data.SampleInterval in aggState)) {
              aggState[data.SampleInterval] = {};
            }
            const intervalData = aggState[data.SampleInterval];
            if (!(m.Config.GUID in intervalData)) {
              intervalData[m.Config.GUID] = {};
            }
            if (!(m.Config.AggFn in intervalData[m.Config.GUID])) {
              intervalData[m.Config.GUID] = { [m.Config.AggFn]: m };
            }
            aggState[data.SampleInterval] = intervalData;
          });
          return aggState;
        });
        setIsLoading(false);
        setJobData(data);
        return newState;
      });
    };

    // General data based on sampleInterval
    useEffect(() => {
      if (!id) {
        return;
      }
      const url = new URL(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/api/job/${id}`
      );
      if (sampleInterval) {
        if (!(sampleInterval in jobCache)) {
          url.searchParams.append("sampleInterval", sampleInterval.toString());
          setIsLoading(true);
          authFetch(url.toString()).then(populateJobCache);
        } else {
          if (!jobCache.Metadata) {
            throw Error("No metadata in jobcache");
          }
          setIsLoading(false);
          setJobData({ ...jobCache.Metadata, MetricData: jobCache[sampleInterval] });
        }
      } else {
        setIsLoading(true);
        authFetch(url.toString()).then(populateJobCache);
      }
    }, [id, node, jobCache, sampleInterval]);

    // AggFn Metrics
    useEffect(() => {
      if (!jobData) {
        return;
      }
      const newData = { ...jobData };
      if (aggFnSelection && sampleInterval && newData.MetricData) {
        const intervalData = { ...aggFnCache[sampleInterval] };
        const newMetricData = newData.MetricData.map((m) => {
          const aggFn = aggFnSelection.get(m.Config.GUID) ?? m.Config.AggFn;
          if (m.Config.GUID in intervalData && aggFn in intervalData[m.Config.GUID]) {
            return intervalData[m.Config.GUID][aggFn];
          } else {
            const url = new URL(
              process.env.NEXT_PUBLIC_BACKEND_URL + `/api/metric/${id}`
            );
            url.searchParams.append("sampleInterval", sampleInterval.toString());
            url.searchParams.append("metric", m.Config.GUID);
            url.searchParams.append("aggFn", aggFn);
            authFetch(url.toString()).then((data: MetricData) => {
              setAggFnCache((prevCache) => {
                const newCache = { ...prevCache };
                newCache[sampleInterval][m.Config.GUID][aggFn] = data;
                return newCache;
              });
            });
          }
          return m;
        });
        newData.MetricData = newMetricData;
        setJobData(newData);
      }
    }, [aggFnSelection, aggFnCache]);

    // Node data
    useEffect(() => {
      if (node && node !== "") {
        if (!sampleInterval) {
          return;
        }
        console.log(sampleInterval, nodeCache);
        if (nodeCache && sampleInterval in nodeCache) {
          const nodes = nodeCache[sampleInterval];
          if (node in nodes) {
            setJobData(nodes[node]);
            setIsLoading(false);
            return;
          }
        }
        const url = new URL(
          process.env.NEXT_PUBLIC_BACKEND_URL + `/api/job/${id}`
        );
        url.searchParams.append("sampleInterval", sampleInterval.toString());
        url.searchParams.append("node", node);
        setIsLoading(true);
        authFetch(url.toString()).then((data: JobData) => {
          setNodeCache((cache) => {
            const intervalData = { ...(cache ?? {})[sampleInterval] };
            intervalData[node] = data;
            return { ...cache, [sampleInterval]: intervalData };
          });
          setIsLoading(false);
          setJobData(data);
          return;
        });
      }
    }, [node, nodeCache, sampleInterval]);

    useEffect(() => {
      if (jobData?.Metadata.IsRunning && jobData.MetricData) {
        const url = new URL(
          process.env.NEXT_PUBLIC_BACKEND_WS + `/api/live/${id}`
        );
        const ws = new WebSocket(url);
        ws.onmessage = (msg) => {
          const data = JSON.parse(msg.data) as WSMsg;
          setLastMessage(data);
        };
        window.onbeforeunload = () => {
          ws.close();
        };
        setWs(ws);
        return () => {
          ws.close();
          setWs(undefined);
        };
      }
    }, [jobData?.Metadata.IsRunning, id]);

    useEffect(() => {
      if (jobData) {
        const newJobData = { ...jobData };
        const data = lastMessage;
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
      }
    }, [lastMessage]);

    useEffect(() => {
      if (curLiveWindowStart === Infinity && timeStart) {
        setCurLiveWindowStart(timeStart);
      }
    }, [timeStart, curLiveWindowStart]);

    useEffect(() => {
      if (ws && ws.readyState === ws.OPEN) {
        if (timeStart && timeStart < curLiveWindowStart) {
          const msg: WSLoadMetricsMsg = {
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
    if (job && job.Metadata && job.MetricData) {
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