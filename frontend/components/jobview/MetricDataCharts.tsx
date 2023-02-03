import * as d3 from "d3";
import { Box, Center, Flex, Grid, IconButton, Menu, MenuButton, MenuItemOption, MenuList, MenuOptionGroup, Spinner } from "@chakra-ui/react";
import { AggFn, MetricConfig, MetricData, MetricPoint } from "../../types/job";
import { Unit } from "../../types/units";
import { LineChart } from "../charts/LineChart";
import { SettingsIcon } from "@chakra-ui/icons";
import React from "react";

interface MetricDataChartsProps {
  metrics: MetricData[] | undefined;
  nodeSelection: string[];
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
  isLoading: boolean;
  autoScale: boolean;
  isRunning: boolean;
  aggFnSelection?: Map<string, AggFn>;
  setAggFnSelection: (m: string, v: AggFn) => void;
}

export const MetricDataCharts = ({
  metrics,
  nodeSelection,
  startTime,
  stopTime,
  setTimeRange,
  isLoading,
  autoScale,
  aggFnSelection,
  setAggFnSelection
}: MetricDataChartsProps) => {
  if (!metrics) {
    return <div>No metric data available</div>;
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
  const chartElements = [];
  // Sort for consistency
  const sortedMetrics = [...metrics].sort((a, b) =>
    a.Config.DisplayName < b.Config.DisplayName ? -1 : 1
  );
  for (const metric of sortedMetrics) {
    if (metric.Data === null) {
      continue;
    }
    const [metricData, z, title] = prepareMetricData(metric, nodeSelection);
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
      <ChartContainer
        key={metric.Config.Measurement}
        metric={metric.Config}
        aggFn={aggFnSelection?.get(metric.Config.GUID)}
        setAggFn={(fn: AggFn) => setAggFnSelection(metric.Config.GUID, fn)}
      >
        <LineChart
          data={metricData}
          x={(d: MetricPoint) => new Date(d._time)}
          y={(d: MetricPoint) => d._value ?? 0}
          z={z}
          xDomain={xDomain}
          setTimeRange={setTimeRange}
          width={document.body.clientWidth / 2}
          title={title}
          unit={metric.Config.Unit}
          yLabel={metric.Config.DisplayName}
          yDomain={yDomain}
          showTooltipSum={metric.Config.AggFn === "sum"}
        />
      </ChartContainer>
    );
  }
  return <Grid templateColumns={"repeat(2, 1fr)"}>{chartElements}</Grid>;
};

const prepareMetricData: (metric: MetricData, nodeSelection: string[]) =>
  [MetricPoint[], ((d: MetricPoint) => string) | undefined, ((d: MetricPoint) => string) | undefined] =
  (metric: MetricData, nodeSelection: string[]) => {
    let metricData: MetricPoint[] = [];
    let z, title;
    if (
      nodeSelection.length === 1 &&
      metric.Config.Type !== "node"
    ) {
      z = (d: MetricPoint) => d["type-id"];
      const pThreadCount = Object.keys(metric.Data).length / 2;
      for (const node of Object.keys(metric.Data)) {
        if (metric.Config.Type === "cpu") {
          // CPU type means we collect data by thread
          // Therefore we have to aggregate physical and corresponding hyperthread data
          if (+node >= pThreadCount) {
            break;
          }
          const pThreadData = metric.Data[node];
          // Corresponding pair is [physIndex, physIndex + totalThreads / 2]
          const hThread = (+node + pThreadCount).toString();
          if (hThread in metric.Data) {
            const hThreadData = metric.Data[hThread];
            // Aggregation per time step
            const aggPoints = pThreadData.map((val, idx) => {
              const aggThread: MetricPoint = Object.assign({}, val);
              switch (metric.Config.PThreadAggFn) {
                case AggFn.Mean:
                  aggThread._value += hThreadData.at(idx)?._value ?? 0;
                  aggThread._value /= 2;
                  break;
                case AggFn.Sum:
                default:
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
      const max = d3.max(d3.map(metricData, (d) => d._value)) ?? 0;
      const maxPrefix = new Unit(max, metric.Config.Unit).bestPrefix();
      title = ((unitStr: string, maxPrefix?: string) => {
        return (d: MetricPoint) =>
          `${d["type-id"]}: ${new Unit(d._value, unitStr).toString(maxPrefix)}`;
      })(metric.Config.Unit, maxPrefix);
    } else if (nodeSelection.length > 0) {
      // Check if is aggregated measurement
      const key = (
        metric.Config.Measurement.endsWith(metric.Config.AggFn) ||
          nodeSelection.length > 1
          ? "hostname"
          : metric.Config.SeparationKey
      ) as keyof MetricPoint;
      z = ((key: keyof MetricPoint) => {
        return (d: MetricPoint) => d[key]?.toString() ?? "";
      })(key);
      for (const node of Object.keys(metric.Data)) {
        if (key !== "hostname" || nodeSelection.indexOf(node) > -1) {
          metricData = metricData.concat(metric.Data[node]);
        }
      }
      const max = d3.max(d3.map(metricData, (d) => d._value)) ?? 0;
      const maxPrefix = new Unit(max, metric.Config.Unit).bestPrefix();
      title = ((
        key: keyof MetricPoint,
        unitStr: string,
        maxPrefix?: string
      ) => {
        return (d: MetricPoint) =>
          `${d[key]}: ${new Unit(d._value, unitStr).toString(maxPrefix)}`;
      })(key, metric.Config.Unit, maxPrefix);
    }
    return [metricData, z, title];
  };

const ChartContainer = ({ children, metric, aggFn, setAggFn }: React.PropsWithChildren<{ metric: MetricConfig, aggFn?: AggFn, setAggFn: (fn: AggFn) => void; }>) => {
  return (
    <Flex
      border="1px"
      borderColor="gray.700"
      borderRadius="md"
      m={3}
      pos="relative"
    >
      {children}
      {metric.AvailableAggFns?.length > 0 && aggFn ?
        <Box position="absolute" right="0">
          <Menu closeOnSelect={false}>
            <MenuButton as={IconButton} icon={<SettingsIcon />} variant="unstyled" size="sm">
            </MenuButton>
            <MenuList>
              <MenuOptionGroup value={aggFn} onChange={(val) => setAggFn(val as AggFn)} title='Per Node Aggregation Method' type='radio'>
                {metric.AvailableAggFns?.map((aggFn) => <MenuItemOption key={aggFn} value={aggFn}>{aggFn}</MenuItemOption>) ?? null}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Box> : null}
    </Flex>);
};

export default MetricDataCharts;
