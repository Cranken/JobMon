import { JobMetadata } from "./../../types/job";
import { Grid, Stack, Text } from "@chakra-ui/react";
import Selection from "./Selection";
import { SelectionMap } from "../../pages/job/[id]";

interface JobInfoProps {
  metadata: JobMetadata;
  setChecked: (val: SelectionMap) => void;
  nodes: { [key: string]: boolean };
}

export const JobInfo = ({ metadata, setChecked, nodes }: JobInfoProps) => {
  return (
    <Grid templateColumns="repeat(2, 1fr)" w="100%">
      <Stack>
        <Text>Id: {metadata.Id}</Text>
        <Text>User: {metadata.UserId}</Text>
        <Text>
          Start: {new Date(metadata.StartTime * 1000).toLocaleString()}
        </Text>
        <Text>End: {new Date(metadata.StopTime * 1000).toLocaleString()}</Text>
      </Stack>
      <Stack>
        <Selection
          setChecked={setChecked}
          items={nodes}
          nodePrefix={metadata.ClusterId}
        />
      </Stack>
    </Grid>
  );
};
