import { Button, Select, Stack, Text, Tooltip } from "@chakra-ui/react";
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
  showChangepoints: boolean
  setShowChangepoints?: (b:boolean) => void;
}

/**
 * ViewControl is a react component to let the user modify how a job is shown.
 * 
 * @param jobdata The data of the job to show .
 * @param showTimeControl Determines whether the user is given the opportunity to select a specific time-range.
 * @param startTime The starttime. All charts will start at this point in time.
 * @param stopTime The stoptime. All charts will end at this point in time.
 * @param setStartTime A callback-function to set startTime.
 * @param setStopTime A callback-function to set stopTime.
 * @param showQuantiles Determines whether the user is shown quantiles or metric data.
 * @param setShowQuantiles A callback-function to set showQuantiles.
 * @param autoScale Determines whether the y-axis of the charts will automatically scale with the given values.
 * @param setAutoScale A callback-function to set autoScale.
 * @param sampleInterval The currently selected sample-interval.
 * @param sampleIntervals All available sample-intervals, the user can chose from.
 * @param setSampleInterval A callback-function to set sampleInterval.
 * @param selectedMetrics The metrics selected to be shown.
 * @param setSelectedMetrics A callback-function to modify selectedMetrics
 * @returns The component
 */
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
  showChangepoints,
  setShowChangepoints
}: ControlProps) => {
  const [, , removeCookie] = useCookies(["Authorization"]);
  return (
    <Stack px={{base: 0, lg: 3}}>
      <Stack direction={{base: "column", lg: "row"}} justify="space-between">
        <MetricSelection
          metrics={jobdata.MetricData?.map((val) => val.Config) ?? []}
          selectedMetrics={selectedMetrics}
          setSelectedMetrics={setSelectedMetrics}
        />
        {jobdata.Metadata.IsRunning ? null : (
          <Button onClick={() => exportData(jobdata.Metadata.Id, removeCookie)}>
            Export as CSV
          </Button>
        )}
      </Stack>
      <Stack direction={{base: "column", lg: "row"}} gap={2}>
        {setShowChangepoints ? (
          <Tooltip label={"Changepoints indicate changes in your codes behavior"}>
            <Button fontSize="sm" onClick={() => setShowChangepoints(!showChangepoints)}>
              Toggle Changepoints
            </Button>
          </Tooltip>
        ) : null}
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

/**
 * This function requests raw data for a specific job from the backend and provides them to the user.
 * The data is packed into a csv-file for each metric. All csv- files are packed into one zip-file.
 * The zip-file is provided for download.
 * 
 * @param id The id of the job to export the data for.
 * @param removeCookie A callback-function to remove the authorization-cookie. This function is used in case the user tries to export a job without the rights to view it.
 */
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
