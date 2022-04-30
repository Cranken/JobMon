import { Button, Flex, Select, Stack, Text } from "@chakra-ui/react";
import React from "react";
import { JobData, JobMetadata } from "../../types/job";
import { MetricSelection } from "./MetricSelection";
import TimeControl from "./TimeControl";

interface ControlProps {
  jobdata: JobData;
  startTime: Date;
  stopTime: Date;
  setStartTime: (t: Date) => void;
  setStopTime: (t: Date) => void;
  showQuantiles: boolean;
  setShowQuantiles: (b: boolean) => void;
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
  return (
    <Stack px={3}>
      <MetricSelection
        metrics={jobdata.MetricData.map((val) => val.Config.Measurement)}
        selectedMetrics={selectedMetrics}
        setSelectedMetrics={setSelectedMetrics}
      ></MetricSelection>
      <Stack direction="row" gap={2}>
        {jobdata.Metadata.NumNodes !== 1 ? (
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
        {sampleInterval && sampleIntervals ? (
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
      <TimeControl
        metadata={jobdata.Metadata}
        startTime={startTime}
        stopTime={stopTime}
        setStartTime={setStartTime}
        setStopTime={setStopTime}
      />
    </Stack>
  );
};

export default ViewControl;
