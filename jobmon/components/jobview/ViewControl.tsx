import { Button, Flex, useColorModeValue } from "@chakra-ui/react";
import React, { useState } from "react";
import { SelectionMap } from "../../pages/job/[id]";
import { JobMetadata } from "../../types/job";
import Selection from "./Selection";
import TimeControl from "./TimeControl";

interface ControlProps {
  metadata: JobMetadata;
  startTime: Date;
  stopTime: Date;
  setStartTime: (t: Date) => void;
  setStopTime: (t: Date) => void;
  showQuantiles: boolean;
  setShowQuantiles: (b: boolean) => void;
  selection: SelectionMap;
  setChecked: (key: string, val: boolean) => void;
}

export const ViewControl = ({
  metadata,
  startTime,
  stopTime,
  setStartTime,
  setStopTime,
  showQuantiles,
  setShowQuantiles,
  selection,
  setChecked,
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
