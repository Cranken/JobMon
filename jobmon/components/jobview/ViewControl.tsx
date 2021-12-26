import { Button, Flex } from "@chakra-ui/react";
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
}

export const ViewControl = ({
  metadata,
  startTime,
  stopTime,
  setStartTime,
  setStopTime,
  showQuantiles,
  setShowQuantiles,
}: ControlProps) => {
  return (
    <Flex>
      <TimeControl
        metadata={metadata}
        startTime={startTime}
        stopTime={stopTime}
        setStartTime={setStartTime}
        setStopTime={setStopTime}
      />
      <Button fontSize="sm" onClick={() => setShowQuantiles(!showQuantiles)}>
        Toggle Quantile View
      </Button>
    </Flex>
  );
};

export default ViewControl;
