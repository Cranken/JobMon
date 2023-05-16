import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { Stack, Select, IconButton, Text } from "@chakra-ui/react";
import React from "react";

interface JobListDisplaySettingsProps {
  joblistLimit: [number, (l: number) => void];
  sortBy: [string, (by: string) => void];
  sortByDescending: [boolean, (val: boolean) => void];
  isWideDevice?: boolean;
}

/**
 * JobListDisplaySettings is a react component allowing the user to change settings for the displayed jobs in the {@link JobList}.
 * 
 * @param joblistLimit The currently set limit of jobs per page and a callback-function to change this limit.
 * @param sortBy The currently set parameter to sort jobs by and a callback-function to change this parameter.
 * @param sortByDescending The currently set direction for the sorted values and a callback-function to change this parameter.
 * @param isWideDevice Determines if the current device is classified as wide.
 * @returns The component.
 */
export const JobListDisplaySettings = ({
  joblistLimit,
  sortBy,
  sortByDescending,
  isWideDevice = true,
}: JobListDisplaySettingsProps) => {
  return (
    <Stack direction={ isWideDevice ? "row" : "column"} justify="space-between">
      <Stack flexGrow={1} direction="row" align="center">
        <Text>Set limit of visible jobs per page:</Text>
        <Select
          value={joblistLimit[0]}
          onChange={(e) => joblistLimit[1](parseInt(e.target.value))}
          maxW="15ch"
        >
          <option value={0}>Show All</option>
          <option value={10}>Show 10</option>
          <option value={25}>Show 25</option>
          <option value={50}>Show 50</option>
        </Select>
      </Stack>
      <Stack flexGrow={1} direction="row" align="center" justify="end">
        <Text>Sort by:</Text>
        <Select
          value={sortBy[0]}
          onChange={(e) => sortBy[1](e.target.value)}
          maxW="25ch"
        >
          <option value={"joblength"}>Job Length</option>
          <option value={"StartTime"}>Start Time</option>
          <option value={"StopTime"}>Stop Time</option>
          <option value={"NumNodes"}>Number of Nodes</option>
          <option value={"Id"}>Job Id</option>
        </Select>
        <IconButton
          aria-label="sort-order"
          variant="ghost"
          onClick={() => sortByDescending[1](!sortByDescending[0])}
          icon={
            sortByDescending[0] ? (
              <ChevronDownIcon boxSize={6} />
            ) : (
              <ChevronUpIcon boxSize={6} />
            )
          }
        />
      </Stack>
    </Stack>
  );
};
