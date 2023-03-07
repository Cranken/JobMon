import { Button, Select, Stack, Text } from "@chakra-ui/react";
import JSZip from "jszip";
import React from "react";
import { useCookies } from "react-cookie";
import { JobData } from "../../types/job";
import { MetricSelection } from "./MetricSelection";
import TimeControl from "./TimeControl";

interface ControlProps {
  jobdata: JobData;
  showTimeControl?: boolean;
  startTime?: Date;
  stopTime?: Date;
  setStartTime: (t: Date) => void;
  setStopTime: (t: Date) => void;
  showQuantiles: boolean;
  setShowQuantiles?: (b: boolean) => void;
  autoScale: boolean;
  setAutoScale: (b: boolean) => void;
  sampleInterval: number | undefined;
  sampleIntervals: number[] | undefined;
  setSampleInterval: (v: number) => void;
  selectedMetrics: string[];
  setSelectedMetrics: (val: string[]) => void;
}

export const ViewControl = ({
  jobdata,
  showTimeControl = true,
  startTime,
  stopTime,
  setStartTime,
  setStopTime,
  showQuantiles,
  setShowQuantiles,
  autoScale,
  setAutoScale,
  sampleInterval,
  sampleIntervals,
  setSampleInterval,
  selectedMetrics,
  setSelectedMetrics,
}: ControlProps) => {
  const [, , removeCookie] = useCookies(["Authorization"]);
  return (
    <Stack px={3}>
      <Stack direction="row" justify="space-between">
        <MetricSelection
          metrics={jobdata.MetricData?.map((val) => val.Config) ?? []}
          selectedMetrics={selectedMetrics}
          setSelectedMetrics={setSelectedMetrics}
        ></MetricSelection>
        {jobdata.Metadata.IsRunning ? null : (
          <Button onClick={() => exportData(jobdata.Metadata.Id, removeCookie)}>
            Export as CSV
          </Button>
        )}
      </Stack>
      <Stack direction="row" gap={2}>
        {setShowQuantiles ? (
          <Button
            fontSize="sm"
            onClick={() => setShowQuantiles(!showQuantiles)}
          >
            Toggle Quantile View
          </Button>
        ) : null}
        <Button fontSize="sm" onClick={() => setAutoScale(!autoScale)}>
          Toggle Automatic Scaling
        </Button>
        {sampleInterval && sampleIntervals && !jobdata.Metadata.IsRunning ? (
          <Stack direction="row" flexGrow={1} align="center" justify="end">
            <Text>Select sample interval in seconds:</Text>
            <Select
              maxW="15ch"
              value={sampleInterval}
              onChange={(e) => setSampleInterval(parseInt(e.target.value))}
            >
              {sampleIntervals.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </Select>
          </Stack>
        ) : null}
      </Stack>
      {showTimeControl ? (
        <TimeControl
          metadata={jobdata.Metadata}
          startTime={startTime}
          stopTime={stopTime}
          setStartTime={setStartTime}
          setStopTime={setStopTime}
        />
      ) : null}
    </Stack>
  );
};

export default ViewControl;

const exportData = (
  id: number,
  removeCookie: (name: "Authorization") => void
) => {
  const url = new URL(
    process.env.NEXT_PUBLIC_BACKEND_URL +
    `/api/job/${id}?raw=true`
  );
  fetch(url.toString(), { credentials: "include" }).then((res) => {
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      removeCookie("Authorization");
    } else {
      res.json().then((data: JobData) => {
        const zip = new JSZip();
        data.MetricData.forEach((m) => zip.file(m.Config.Measurement + ".csv", m.RawData));
        zip.generateAsync({ type: "blob" }).then((b) => {
          const link = document.createElement("a");
          link.href = window.URL.createObjectURL(b);
          link.setAttribute("download", `${id}_export.zip`);

          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        });
      });
    }
  });
};
