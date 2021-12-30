import { Center, Flex, Grid, Spinner } from "@chakra-ui/react";
import { MetricData, MetricPoint } from "../../types/job";
import { LineChart } from "./LineChart";

interface MetricDataChartsProps {
  metrics: MetricData[] | undefined;
  nodeSelection: string[];
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
  isLoading: boolean;
}

export const MetricDataCharts = ({
  metrics,
  nodeSelection,
  startTime,
  stopTime,
  setTimeRange,
  isLoading,
}: MetricDataChartsProps) => {
  if (!metrics) {
    return <div>No metrics</div>;
  }
  if (isLoading) {
    return (
      <Center>
        <Spinner />
      </Center>
    );
  }
  const xDomain: [Date, Date] = [
    startTime ?? new Date(0),
    stopTime ?? new Date(),
  ];
  let chartElements = [];
  const sortedMetrics = metrics.sort((a, b) =>
    a.Config.Measurement < b.Config.Measurement ? -1 : 1
  );
  for (const metric of sortedMetrics) {
    let metricData: MetricPoint[] = [];
    if (metric.Data === null) {
      continue;
    }
    let z;
    let title;
    if (nodeSelection.length === 1 && metric.Config.Type !== "node") {
      z = (d: MetricPoint) => d["type-id"];
      title = (d: MetricPoint) =>
        `${d["type-id"]}: ${
          +d._value === 0
            ? 0
            : d._value > 1
            ? d._value
            : d._value.toFixed(
                1 - Math.floor(Math.log(d._value) / Math.log(10))
              )
        }`;
      const pThreadCount = Object.keys(metric.Data).length / 2;
      for (const node of Object.keys(metric.Data)) {
        if (metric.Config.Type === "cpu") {
          if (+node >= pThreadCount) {
            break;
          }
          let pThreadData = metric.Data[node];
          const hThread = (+node + pThreadCount).toString();
          if (hThread in metric.Data) {
            const hThreadData = metric.Data[hThread];
            const aggPoints = pThreadData.map((val, idx) => {
              let aggThread = val;
              aggThread._value += hThreadData.at(idx)?._value ?? 0;
              return aggThread;
            });
            metricData = metricData.concat(aggPoints);
          } else {
            metricData = metricData.concat(pThreadData);
          }
        } else {
          metricData = metricData.concat(metric.Data[node]);
        }
      }
    } else {
      z = (d: MetricPoint) => d["hostname"];
      title = (d: MetricPoint) =>
        `${d["hostname"]}: ${
          +d._value === 0
            ? 0
            : d._value > 1
            ? d._value
            : d._value.toFixed(
                1 - Math.floor(Math.log(d._value) / Math.log(10))
              )
        }`;
      for (const node of Object.keys(metric.Data)) {
        if (nodeSelection.indexOf(node) > -1) {
          metricData = metricData.concat(metric.Data[node]);
        }
      }
    }

    chartElements.push(
      <Flex border="1px" borderColor="gray.700" borderRadius="md" m={3}>
        <LineChart
          key={metric.Config.Measurement}
          data={metricData}
          x={(d: MetricPoint) => new Date(d._time)}
          y={(d: MetricPoint) => d._value}
          z={z}
          xDomain={xDomain}
          setTimeRange={setTimeRange}
          width={document.body.clientWidth / 2}
          title={title}
          unit={metric.Config.Unit}
          yLabel={metric.Config.DisplayName}
        />
      </Flex>
    );
  }
  return <Grid templateColumns={"repeat(2, 1fr)"}>{chartElements}</Grid>;
};

export default MetricDataCharts;
