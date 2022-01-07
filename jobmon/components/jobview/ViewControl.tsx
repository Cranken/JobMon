import { Button, Flex, Stack } from "@chakra-ui/react";
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
      <Stack direction="row" gap={1}>
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
      </Stack>
    </Stack>
  );
};

export default ViewControl;
