import {
  Flex,
  useColorModeValue,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from "@chakra-ui/react";
import { JobData } from "../../types/job";
import { BoxPlot } from "../charts/BoxPlot";
import { Unit } from "../../types/units";

interface AnalysisBoxPlotProps {
  data?: JobData;
}

export const AnalysisBoxPlot = ({ data }: AnalysisBoxPlotProps) => {
  const fillColor = useColorModeValue("#ddd", "#727272");
  if (!data) {
    return null;
  }

  const elements: JSX.Element[] = [];
  data.Metadata.Data.forEach((val) => {
    elements.push(
      <BoxPlot
        key={val.Config.Measurement}
        data={Object.values(val.Data)}
        y={(dat) => dat}
        width={window.document.body.clientWidth / 6}
        yLabel={val.Config.DisplayName}
        fill={fillColor}
        unit={val.Config.Unit}
      />
    );
  });
  return <Flex>{elements}</Flex>;
};

interface AnalysisTableViewProps {
  data?: JobData;
}
export const AnalysisTableView = ({ data }: AnalysisTableViewProps) => {
  if (!data) {
    return null;
  }
  const rows = data.Metadata.NodeList.split("|").map((node) => {
    const nodeData = data.Metadata.Data.flatMap(
      (val) => new Unit(val.Data[node], val.Config.Unit)
    );
    return (
      <Tr key={node}>
        <Td>{node}</Td>
        {nodeData.map((val, idx) => (
          <Td key={idx}>{val.toString()}</Td>
        ))}
      </Tr>
    );
  });

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Node</Th>
          {data.Metadata.Data.map((val) => (
            <Th key={val.Config.Measurement}>{val.Config.DisplayName}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>{rows}</Tbody>
    </Table>
  );
};

interface AnalysisPlotsProps {
  data?: JobData;
}
export const AnalysisPlots = ({ data }: AnalysisPlotsProps) => {
  if (!data) {
    return null;
  }
  data.Metadata.Data.sort((a, b) =>
    a.Config.DisplayName < b.Config.DisplayName ? -1 : 1
  );
  return (
    <>
      <AnalysisBoxPlot data={data}></AnalysisBoxPlot>
      <AnalysisTableView data={data}></AnalysisTableView>
    </>
  );
};

export default AnalysisPlots;
