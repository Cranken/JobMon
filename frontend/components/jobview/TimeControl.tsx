import {
  Box,
  Flex,
} from "@chakra-ui/react";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { JobMetadata } from "../../types/job";
import React, { ReactNode, useEffect, useState } from "react";

import "rc-slider/assets/index.css";

const Range = createSliderWithTooltip(Slider.Range);
interface TimeControlProps {
  metadata: JobMetadata;
  startTime?: Date;
  stopTime?: Date;
  setStartTime: (t: Date) => void;
  setStopTime: (t: Date) => void;
}

const TimeControl = ({
  metadata,
  startTime,
  stopTime,
  setStartTime,
  setStopTime,
}: TimeControlProps) => {
  const defaultTime = [metadata.StartTime * 1000, metadata.StopTime * 1000];
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipValues, setTooltipValues] = useState([
    defaultTime[0],
    defaultTime[1],
  ]);
  useEffect(() => {
    setTooltipValues([startTime?.getTime() ?? 0, stopTime?.getTime() ?? 1]);
  }, [startTime, stopTime]);
  const marks: Record<number, ReactNode> = {};
  let t = metadata.StartTime * 1000;
  const inc = ((metadata.StopTime - metadata.StartTime) / 4) * 1000;
  for (let i = 0; i < 4; i++) {
    marks[t] = new Date(t).toLocaleString();
    t += inc;
  }
  if (metadata.IsRunning) {
    marks[t] = "Live";
  } else {
    marks[t] = new Date(t).toLocaleString();
  }

  return (
    <Flex maxH={10} align="center" w="100%">
      <Box mr={5} w="100%">
        <Range
          min={defaultTime[0]}
          max={defaultTime[1]}
          defaultValue={defaultTime}
          value={tooltipValues}
          draggableTrack={true}
          onBeforeChange={() => setShowTooltip(true)}
          onChange={(val) => {
            setShowTooltip(true);
            if (metadata.IsRunning) {
              setTooltipValues([val[0], tooltipValues[1]]);
            } else {
              setTooltipValues(val);
            }
          }}
          onAfterChange={(val) => {
            setShowTooltip(false);
            setStartTime(new Date(val[0]));
            if (!metadata.IsRunning) {
              setStopTime(new Date(val[1]));
            }
          }}
          marks={marks}
          tipFormatter={(val) => new Date(val).toLocaleTimeString()}
          tipProps={{ visible: showTooltip }}
        />
      </Box>
      {/* <Button
        fontSize="sm"
        onClick={() => {
          setStartTime(new Date(metadata.StartTime * 1000));
          setStopTime(new Date(metadata.StopTime * 1000));
        }}
      >
        Reset Time Range
      </Button> */}
    </Flex>
  );
};

export default TimeControl;
