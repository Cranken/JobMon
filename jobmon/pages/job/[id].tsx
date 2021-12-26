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
  Button,
  Center,
  Flex,
  Grid,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
} from "@chakra-ui/react";
import { JobInfo } from "../../components/jobview/JobInfo";
import { BoxPlot } from "../../components/charts/BoxPlot";

export type SelectionMap = { [key: string]: boolean };

const Job: NextPage = () => {
  const router = useRouter();
  const jobId = router.query["id"];
  const [selection, setSelection] = useState<SelectionMap>({});
  const selected = Object.keys(selection).filter((val) => selection[val]);
  const node = selected.length === 1 ? selected[0] : undefined;
  const data = useGetJobData(parseInt(jobId as string), node);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [stopTime, setStopTime] = useState<Date>(new Date());
  const [showQuantiles, setShowQuantiles] = useState(true);
  const fillColor = useColorModeValue("#ddd", "#727272");

  const generateChartsMemo = useMemo(() => {
    const setTimeRange = (start: Date, end: Date) => {
      setStartTime(start);
      setStopTime(end);
    };
    return showQuantiles ? (
      <QuantileDataCharts
        quantiles={data?.QuantileData}
        startTime={startTime}
        stopTime={stopTime}
        setTimeRange={setTimeRange}
      />
    ) : (
      <MetricDataCharts
        metrics={data?.MetricData}
        nodeSelection={selected}
        startTime={startTime}
        stopTime={stopTime}
        setTimeRange={setTimeRange}
      />
    );
  }, [data, selected, startTime, stopTime, showQuantiles]);

  useEffect(() => {
    if (data?.Metadata.NodeList !== undefined) {
      let allHostSelection: SelectionMap = {};
      const nodes = data.Metadata.NodeList.split("|");
      nodes.forEach((val) => {
        allHostSelection[val] = true;
      });
      setSelection(allHostSelection);
    }
  }, [data?.Metadata.NodeList]);

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

  const setChecked = (key: string, val: boolean) => {
    const newSelection = { ...selection };
    if (key === "all") {
      Object.keys(newSelection).forEach((k) => (newSelection[k] = val));
    } else if (key in selection) {
      newSelection[key] = val;
    }
    if (selection !== newSelection) {
      setSelection(newSelection);
    }
  };

  console.log("Main data", data);

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
          selection={selection}
          setChecked={setChecked}
        />
      </Grid>
      <Tabs>
        <TabList>
          <Tab>Timeline</Tab>
          <Tab>Analysis</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>{generateChartsMemo}</TabPanel>
          <TabPanel>
            <Flex>
              {data.Metadata.Data.map((val) => (
                <BoxPlot
                  key={val.Config.Measurement}
                  data={val.Data}
                  y={(dat) => dat}
                  width={window.document.body.clientWidth / 6}
                  yLabel={val.Config.DisplayName}
                  fill={fillColor}
                />
              ))}
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
export default Job;

export const useGetJobData = (id: number | undefined, node?: string) => {
  const [jobData, setJobData] = useState<JobData>();
  const [jobCache, setJobCache] = useState<{ [key: string]: JobData }>({});
  useEffect(() => {
    if (!id) {
      return;
    }
    let URL = process.env.NEXT_PUBLIC_BACKEND_URL + `/api/job/${id}`;
    if (node && node != "" && !node.includes("|")) {
      URL += `?node=${node}`;
      if (node in jobCache) {
        setJobData(jobCache[node]);
        return;
      }
    }
    if (!node && "all" in jobCache) {
      setJobData(jobCache["all"]);
      return;
    }
    fetch(URL, { credentials: "include" }).then((res) =>
      res.json().then((data) => {
        setJobCache((prevState) => {
          prevState[node ? node : "all"] = data;
          return prevState;
        });
        setJobData(data);
      })
    );
  }, [id, node, jobCache]);
  return jobData;
};
