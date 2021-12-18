import type { NextPage } from "next";
import React, { useMemo } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Selection } from "../../components/Selection";
import { JobData } from "../../types/job";
import MetricDataCharts from "../../components/charts/MetricDataCharts";
import { useRouter } from "next/router";
import QuantileDataCharts from "../../components/charts/QuantileDataCharts";

export type SelectionMap = { [key: string]: boolean };

const Job: NextPage = () => {
  const router = useRouter();
  const jobId = router.query["id"];
  const [selection, setSelection] = useState<SelectionMap>({});
  const [showSelection, setShowSelection] = useState(false);
  const selected = Object.keys(selection).filter((val) => selection[val]);
  const node = selected.length === 1 ? selected[0] : undefined;
  const data = useGetJobData(parseInt(jobId as string), node);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [stopTime, setStopTime] = useState<Date>(new Date());
  const [showQuantiles, setShowQuantiles] = useState(true);

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

  let elements = [];
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
    return <div>Loading/Error</div>;
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

  if (data.Metadata.StartTime && data.Metadata.StopTime) {
    const timezoneOffsetMsec = new Date().getTimezoneOffset() * 60 * 1000;
    const getDateString = (d: Date) =>
      new Date(d.getTime() - timezoneOffsetMsec).toISOString().slice(0, 16);

    const minDate = new Date(data.Metadata.StartTime * 1000);
    const min = getDateString(minDate);
    const maxDate = new Date(data.Metadata.StopTime * 1000);
    const max = getDateString(maxDate);
    elements.push(
      <React.Fragment>
        <label htmlFor="start-time">Start Time:</label>
        <input
          type="datetime-local"
          id="start-time"
          name="start-time"
          value={getDateString(startTime)}
          min={min}
          // max={maxDate > stopTime ? max : getDateString(stopTime)}
          max={getDateString(stopTime)}
          onChange={(ev) => {
            const newVal = new Date(ev.target.value);
            if (minDate <= newVal && newVal < stopTime) setStartTime(newVal);
          }}
        />
        <label htmlFor="end-time">End Time:</label>
        <input
          type="datetime-local"
          id="end-time"
          name="end-time"
          value={getDateString(stopTime)}
          // min={minDate < startTime ? min : getDateString(startTime)}
          min={getDateString(startTime)}
          max={max}
          onChange={(ev) => {
            const newVal = new Date(ev.target.value);
            if (startTime < newVal && newVal <= maxDate) setStopTime(newVal);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setStartTime(new Date(data.Metadata.StartTime * 1000));
            setStopTime(new Date(data.Metadata.StopTime * 1000));
          }}
        >
          Reset Time Range
        </button>
      </React.Fragment>
    );
  }

  elements.push(
    <button type="button" onClick={() => setShowQuantiles(!showQuantiles)}>
      Toggle Quantile View
    </button>
  );

  if (!showQuantiles) {
    elements.push(
      <button type="button" onClick={() => setShowSelection(!showSelection)}>
        Toggle node selection
      </button>
    );

    if (showSelection) {
      elements.push(
        <Selection height={"100px"} setChecked={setChecked} items={selection} />
      );
    }
  }

  return (
    <div>
      <div>{elements}</div>
      {generateChartsMemo}
    </div>
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
    fetch(URL).then((res) =>
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
