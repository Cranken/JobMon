import { Button, Flex, Select, Stack, Text } from "@chakra-ui/react";
import React from "react";
import { JobMetadata } from "../../types/job";
import TimeControl from "./TimeControl";

interface ControlProps {
  metadata: JobMetadata;
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
}

export const ViewControl = ({
  metadata,
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
}: ControlProps) => {
  return (
    <Stack>
      <TimeControl
        metadata={metadata}
        startTime={startTime}
        stopTime={stopTime}
        setStartTime={setStartTime}
        setStopTime={setStopTime}
      />
      <Stack direction="row" gap={2}>
        {metadata.NumNodes !== 1 ? (
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
          <Stack
            direction="row"
            flexGrow={1}
            align="center"
            justify="end"
            pr={3}
          >
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
    </Stack>
  );
};

export default ViewControl;
