import { Center, Flex, Grid, Spinner } from "@chakra-ui/react";
import { MetricData, MetricPoint } from "../../types/job";
import { Unit } from "../../types/units";
import { LineChart } from "./LineChart";

interface MetricDataChartsProps {
  metrics: MetricData[] | undefined;
  nodeSelection: string[];
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
  isLoading: boolean;
  autoScale: boolean;
}

export const MetricDataCharts = ({
  metrics,
  nodeSelection,
  startTime,
  stopTime,
  setTimeRange,
  isLoading,
  autoScale,
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
  const sortedMetrics = [...metrics].sort((a, b) =>
    a.Config.DisplayName < b.Config.DisplayName ? -1 : 1
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
      title = ((unitStr: string) => {
        return (d: MetricPoint) =>
          `${d["type-id"]}: ${new Unit(d._value, unitStr).toString()}`;
      })(metric.Config.Unit);
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
              let aggThread = Object.assign({}, val);
              if (metric.Config.PThreadAggFn === "mean") {
                aggThread._value += hThreadData.at(idx)?._value ?? 0;
                aggThread._value /= 2;
              } else {
                aggThread._value += hThreadData.at(idx)?._value ?? 0;
              }
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
      const key = (
        nodeSelection.length === 1 && metric.Config.SeparationKey !== ""
          ? metric.Config.SeparationKey
          : "hostname"
      ) as keyof MetricPoint;
      z = ((key: keyof MetricPoint) => {
        return (d: MetricPoint) => d[key]?.toString() ?? "";
      })(key);
      title = ((key: keyof MetricPoint, unitStr: string) => {
        return (d: MetricPoint) =>
          `${d[key]}: ${new Unit(d._value, unitStr).toString()}`;
      })(key, metric.Config.Unit);
      for (const node of Object.keys(metric.Data)) {
        if (key !== "hostname" || nodeSelection.indexOf(node) > -1) {
          metricData = metricData.concat(metric.Data[node]);
        }
      }
    }
    let yDomain: [number, number] | undefined = undefined;
    if (!autoScale) {
      const max =
        nodeSelection.length === 1
          ? metric.Config.MaxPerType
          : metric.Config.MaxPerNode;
      if (max !== 0) {
        yDomain = [0, max];
      }
    }

    chartElements.push(
      <Flex
        border="1px"
        borderColor="gray.700"
        borderRadius="md"
        m={3}
        key={metric.Config.Measurement}
      >
        <LineChart
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
          yDomain={yDomain}
        />
      </Flex>
    );
  }
  return <Grid templateColumns={"repeat(2, 1fr)"}>{chartElements}</Grid>;
};

export default MetricDataCharts;
