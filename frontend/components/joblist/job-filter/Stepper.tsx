import {
  Box,
  Flex,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Text,
} from "@chakra-ui/react";
import React from "react";

interface StepperProps {
  minimum: number;
  lowerLimit: number;
  setLowerLimit: (v: number) => void;
  maximum: number;
  upperLimit: number;
  setUpperLimit: (v: number) => void;
  title: string;
}

export const Stepper = ({
  minimum,
  lowerLimit,
  setLowerLimit,
  maximum,
  upperLimit,
  setUpperLimit,
  title,
}: StepperProps) => {
  return (
    <Box flexGrow={1}>
      <Flex justify="space-between" align="center">
        <NumberInput
          maxW="10ch"
          value={lowerLimit}
          min={minimum}
          max={upperLimit}
          onChange={(_, val) => setLowerLimit(val)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>

        <Text>{title}</Text>

        <NumberInput
          maxW="10ch"
          value={upperLimit}
          min={lowerLimit}
          max={maximum}
          onChange={(_, val) => setUpperLimit(val)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </Flex>

      <Box w="100%">
        <RangeSlider
          defaultValue={[minimum, maximum]}
          min={minimum}
          max={maximum}
          value={[lowerLimit, upperLimit]}
          onChange={(val) => {
            setLowerLimit(val[0]);
            setUpperLimit(val[1]);
          }}
        >
          <RangeSliderTrack>
            <RangeSliderFilledTrack />
          </RangeSliderTrack>
          <RangeSliderThumb index={0} />
          <RangeSliderThumb index={1} />
        </RangeSlider>
      </Box>
    </Box>
  );
};
