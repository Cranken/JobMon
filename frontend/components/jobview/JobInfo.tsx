import { JobMetadata } from "../../types/job";
import { Box, Grid, Stack, Tag, Text } from "@chakra-ui/react";
import Selection from "./Selection";
import { SelectionMap } from "../../types/helpers";
import { TagPanel } from "./TagPanel";
import React from "react";

interface JobInfoProps {
  metadata: JobMetadata;
  setChecked: (val: SelectionMap) => void;
  nodes: { [key: string]: boolean; };
}

/**
 * JobInfo is a react component displaying information about one job.
 * 
 * @param metadata Metadata for the job. 
 * @param setChecked Function to modify nodes.
 * @param nodes A Map describing the selected nodes.
 * @returns The component
 */
export const JobInfo = ({
  metadata,
  setChecked,
  nodes,
}: JobInfoProps) => {
  const prefixMatch = metadata.NodeList.split("|")[0].match(/([a-zA-Z]+)(\d*)/);
  const prefix = prefixMatch ? prefixMatch[1] : metadata.ClusterId;
  return (
    <Grid templateColumns={{base: "repeat(1, 1fr)", lg: "repeat(2, 1fr)"}} w="100%">
      <Stack>
        <Text>Id: {metadata.Id}</Text>
        <Text>
          User: {metadata.UserName} ({metadata.GroupName})
        </Text>
        <Text>Name: {metadata.JobName}</Text>
        <Text>
          Start: {new Date(metadata.StartTime * 1000).toLocaleString()}
        </Text>
        {metadata.IsRunning ? (
          <Box>
            <Tag colorScheme="green">Running</Tag>
          </Box>
        ) : (
          <Text>End: {new Date(metadata.StopTime * 1000).toLocaleString()}</Text>
        )}
        <TagPanel job={metadata}></TagPanel>
      </Stack>
      <Stack>
        <Selection
          setChecked={setChecked}
          items={nodes}
          nodePrefix={prefix}
          selectionAllowed={!metadata.IsRunning}
        />
      </Stack>
    </Grid>
  );
};
