import { Flex, useColorModeValue } from "@chakra-ui/react";
import { JobMetadataData } from "../../types/job";
import { BoxPlot } from "../charts/BoxPlot";

interface AnalysisViewProps {
  data: JobMetadataData[];
}

export const AnalysisView = ({ data }: AnalysisViewProps) => {
  const fillColor = useColorModeValue("#ddd", "#727272");

  return (
    <Flex>
      {data.map((val) => (
        <BoxPlot
          key={val.Config.Measurement}
          data={val.Data}
          y={(dat) => dat}
          width={window.document.body.clientWidth / 6}
          yLabel={val.Config.DisplayName}
          fill={fillColor}
        />
      ))}
    </Flex>
  );
};
