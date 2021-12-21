import { Flex, Input, Spacer, Text, Center, Button } from "@chakra-ui/react";
import { Dispatch, SetStateAction, useState } from "react";

import style from "./JobFilter.module.css";

interface JobFilterProps {
  userId: [string, Dispatch<SetStateAction<string>>];
  startTime: [Date, Dispatch<SetStateAction<Date>>];
  stopTime: [Date, Dispatch<SetStateAction<Date>>];
}

export const JobFilter = ({ userId, startTime, stopTime }: JobFilterProps) => {
  const timezoneOffsetMsec = new Date().getTimezoneOffset() * 60 * 1000;
  const getDateString = (d: Date) =>
    new Date(d.getTime() - timezoneOffsetMsec).toISOString().slice(0, 16);
  return (
    <Center>
      <Flex
        w="50%"
        borderWidth="1px"
        borderRadius="lg"
        padding="3ch"
        margin="2ch"
      >
        <Input
          value={userId[0]}
          placeholder="User Id"
          maxW="15ch"
          mr={5}
          onChange={(ev) => userId[1](ev.target.value)}
        />
        <Flex
          justify="center"
          align="center"
          borderWidth="1px"
          borderRadius="lg"
          px={2}
        >
          <Text mr={2}>Filter between:</Text>
          <input
            className={style["time-input"]}
            type="datetime-local"
            min="2021-10-01T00:00"
            value={getDateString(startTime[0])}
            onChange={(ev) => startTime[1](new Date(ev.target.value))}
          />
          <Spacer mx={1} />
          <Text mr={2}>and:</Text>
          <input
            className={style["time-input"]}
            type="datetime-local"
            min="2021-10-01T00:00"
            value={getDateString(stopTime[0])}
            onChange={(ev) => stopTime[1](new Date(ev.target.value))}
          />
          <Spacer mx={1} />
          <Button
            size="sm"
            onClick={() => {
              startTime[1](new Date("2021-10-01"));
              stopTime[1](new Date());
            }}
          >
            Reset
          </Button>
        </Flex>
      </Flex>
    </Center>
  );
};

export default JobFilter;
