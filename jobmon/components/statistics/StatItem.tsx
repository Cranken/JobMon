import { JobListData } from "../../types/job";
import { groupBy } from "../../utils/utils";
import { JobMetadata } from "../../types/job";
import { Box, Center } from "@chakra-ui/react";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";

interface StatItemProps {
  data: JobListData;
  attribute: keyof JobMetadata;
}

export const StatItem = ({ data, attribute }: StatItemProps) => {
  if (data) {
    const groups = groupBy(data?.Jobs, (obj) => obj[attribute].toString());
    const tuples: [string, number][] = Object.keys(groups).map((attribute) => [
      attribute,
      groups[attribute].length,
    ]);
    tuples.sort((a, b) => b[1] - a[1]);
    return (
      // <Center m={2}>
      <Box maxH={800} maxW={1000} overflowY={"auto"}>
        <HorizontalBarChart
          data={tuples.slice(0, 20)}
          column={(t) => t[0]}
          value={(t) => t[1]}
          yLabel={attribute}
        ></HorizontalBarChart>
      </Box>
      // </Center>
    );
  } else {
    return null;
  }
};
