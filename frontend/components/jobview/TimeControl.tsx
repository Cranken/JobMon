import {
  Box,
  Button,
  Center,
  Flex,
  Hide,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Show,
  useDisclosure,
} from "@chakra-ui/react";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { JobMetadata } from "../../types/job";
import React, { ReactNode, useEffect, useState } from "react";

import "rc-slider/assets/index.css";
import { RepeatClockIcon } from "@chakra-ui/icons";

const Range = createSliderWithTooltip(Slider.Range);
interface TimeControlProps {
  metadata: JobMetadata;
  startTime?: Date;
  stopTime?: Date;
  setStartTime: (t: Date) => void;
  setStopTime: (t: Date) => void;
}

/**
 * TimeControl is a react component giving the user the opportunity to select a time-range.
 * This component is used to select a time-range corresponding to a specific job to modify the data shown in charts.
 * 
 * @param metadata The data of the job.
 * @param startTime The starttime. The charts will start at this point in time.
 * @param stopTime The stoptime. The charts will end at this point in time.
 * @param setStartTime A callback-function to set startTime.
 * @param setStopTime A callback-function to set stopTime.
 * @returns The component
 */
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
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    // Setting the text for the tooltip dynamically.
    setTooltipValues([startTime?.getTime() ?? 0, stopTime?.getTime() ?? 1]);
  }, [startTime, stopTime]);

  const marks: Record<number, ReactNode> = {};
  let t = metadata.StartTime * 1000;

  // Calculate the number of marks depending on the size of the device
  const numberOfMarks = 4;

  const inc = ((metadata.StopTime - metadata.StartTime) / numberOfMarks) * 1000;
  for (let i = 0; i < numberOfMarks; i++) {
    marks[t] = new Date(t).toLocaleString();
    t += inc;
  }
  if (metadata.IsRunning) {
    marks[t] = "Live";
  } else {
    marks[t] = new Date(t).toLocaleString();
  }

  return (
    <Flex
      align="center"
      w="100%"
      direction={{ base: "column-reverse", lg: "row" }}>
      <Show below={"lg"}>
        <Button w={"100%"} onClick={onOpen}>
          Manage Time-Range
        </Button>
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Modify Time Range</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Box
                pt={10}
                pb={10}
                w={"100%"}
                h={"50vh"}>
                <Center w={"100%"} h={"100%"}>
                <Range
                  min={defaultTime[0]}
                  max={defaultTime[1]}
                  defaultValue={defaultTime}
                  value={tooltipValues}
                  draggableTrack={true}
                  vertical
                  
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
                </Center>
              </Box>
              <Button
                fontSize="sm"
                onClick={() => {
                  setStartTime(new Date(metadata.StartTime * 1000));
                  setStopTime(new Date(metadata.StopTime * 1000));
                }}
                w={"100%"}
              >
                <RepeatClockIcon mr={2}/>
                Reset Time Range
              </Button>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Show>
      <Hide below={"lg"}>
        <Box
          mr={50}
          ml={50}
          mb={{
            base: 10,
            xl: 0
          }}
          w={"100%"}>

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
        <Button
          fontSize="sm"
          onClick={() => {
            setStartTime(new Date(metadata.StartTime * 1000));
            setStopTime(new Date(metadata.StopTime * 1000));
          }}
        >
          Reset Time Range
        </Button>
      </Hide>

    </Flex>
  );
};

export default TimeControl;
