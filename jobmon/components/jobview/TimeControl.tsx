import { Box, Button, Flex } from "@chakra-ui/react";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { JobMetadata } from "../../types/job";
import { useEffect, useState } from "react";

import "rc-slider/assets/index.css";

const Range = createSliderWithTooltip(Slider.Range);
interface TimeControlProps {
  metadata: JobMetadata;
  startTime: Date;
  stopTime: Date;
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
    setTooltipValues([startTime.getTime(), stopTime.getTime()]);
  }, [startTime, stopTime]);

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
            setTooltipValues(val);
          }}
          onAfterChange={(val) => {
            setShowTooltip(false);
            setStartTime(new Date(val[0]));
            setStopTime(new Date(val[1]));
          }}
          tipFormatter={(val) => new Date(val).toLocaleTimeString()}
          tipProps={{ visible: showTooltip }}
        />
      </Box>
      <Button
        fontSize="sm"
        onClick={() => {
          setStartTime(new Date(metadata.StartTime * 1000));
          setStopTime(new Date(metadata.StopTime * 1000));
        }}
      >
        Reset Time Range
      </Button>
    </Flex>
  );
};

export default TimeControl;
