import {
  useColorModeValue,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Wrap,
} from "@chakra-ui/react";
import { JobData } from "../../types/job";
import { BoxPlot } from "../charts/BoxPlot";
import { Unit } from "../../types/units";
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

interface AnalysisBoxPlotProps {
  data?: JobData;
  autoScale: boolean;
}

export const AnalysisBoxPlot = ({ data, autoScale }: AnalysisBoxPlotProps) => {
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
        yDomain={[0, val.Config.MaxPerNode]}
        autoScale={autoScale}
      />
    );
  });
  return <Wrap>{elements}</Wrap>;
};

interface AnalysisTableViewProps {
  data?: JobData;
}
export const AnalysisTableView = ({ data }: AnalysisTableViewProps) => {
  const [sortBy, setSortBy] = useState("node");
  const [descending, setDescending] = useState(true);
  if (!data || !data.Metadata.Data) {
    return null;
  }
  let nodes: string[] = [];
  if (sortBy !== "node") {
    const metric = data.Metadata.Data.find(
      (val) => val.Config.Measurement === sortBy
    );
    if (metric) {
      nodes = Object.keys(metric?.Data ?? {});
      nodes.sort((a, b) => (metric?.Data[a] < metric?.Data[b] ? 1 : -1));
      if (!descending) {
        nodes.reverse();
      }
    }
  }
  if (nodes.length === 0) {
    nodes = data.Metadata.NodeList.split("|");
    if (!descending) {
      nodes.reverse();
    }
  }

  const rows = nodes.map((node) => {
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
          <Th
            cursor="pointer"
            onClick={() => {
              if (sortBy === "node") {
                setDescending(!descending);
              } else {
                setDescending(true);
              }
              setSortBy("node");
            }}
          >
            Node
            {sortBy === "node" ? (
              descending ? (
                <ChevronDownIcon boxSize={5} />
              ) : (
                <ChevronUpIcon boxSize={5} />
              )
            ) : null}
          </Th>
          {data.Metadata.Data.map((val) => (
            <Th
              cursor="pointer"
              onClick={() => {
                if (sortBy === val.Config.Measurement) {
                  setDescending(!descending);
                } else {
                  setDescending(true);
                }
                setSortBy(val.Config.Measurement);
              }}
              key={val.Config.Measurement}
            >
              {val.Config.DisplayName}
              {sortBy === val.Config.Measurement ? (
                descending ? (
                  <ChevronDownIcon boxSize={5} />
                ) : (
                  <ChevronUpIcon boxSize={5} />
                )
              ) : null}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>{rows}</Tbody>
    </Table>
  );
};
