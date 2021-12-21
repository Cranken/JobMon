import {
  Box,
  Button,
  Flex,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
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
    <Flex maxH={10} align="center" marginX={5} w="100%">
      {/* <Text whiteSpace="nowrap" mr={5}>
        Time Control
      </Text> */}
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
      {/* <Box
        sx={{
          ".time-input": {
            bg: useColorModeValue("gray.200", "whiteAlpha.300"),
          },
        }}
      >
        <label htmlFor="start-time">Start Time:</label>
        <input
          className="time-input"
          type="datetime-local"
          id="start-time"
          name="start-time"
          value={getDateString(startTime)}
          min={min}
          max={getDateString(stopTime)}
          onChange={(ev) => {
            const newVal = new Date(ev.target.value);
            if (minDate <= newVal && newVal < stopTime) setStartTime(newVal);
          }}
        />
        <label htmlFor="end-time">End Time:</label>
        <input
          className="time-input"
          type="datetime-local"
          id="end-time"
          name="end-time"
          value={getDateString(stopTime)}
          min={getDateString(startTime)}
          max={max}
          onChange={(ev) => {
            const newVal = new Date(ev.target.value);
            if (startTime < newVal && newVal <= maxDate) setStopTime(newVal);
          }}
        />
      </Box> */}
    </Flex>
  );
};

export default TimeControl;
