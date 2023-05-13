import * as d3 from "d3";
import { QuantileData } from "../../types/job";
import { LineChart } from "../charts/LineChart";
import { QuantilePoint } from "../../types/job";
import { Center, Flex, Grid, Spinner } from "@chakra-ui/react";
import { Unit } from "../../types/units";
import React from "react";

interface QuantileDataChartsProps {
  quantiles: QuantileData[] | undefined;
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
  isLoading: boolean;
  autoScale: boolean;
  numColumns?: number;
}

export const QuantileDataCharts = ({
  quantiles,
  startTime,
  stopTime,
  setTimeRange,
  isLoading,
  autoScale,
  numColumns = 2,
}: QuantileDataChartsProps) => {
  if (!quantiles) {
    return <div>No quantiles</div>;
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
  const sortedMetrics = quantiles.sort((a, b) =>
    a.Config.DisplayName < b.Config.DisplayName ? -1 : 1
  );
  for (const metric of sortedMetrics) {
    let metricData: QuantilePoint[] = [];
    if (metric.Data === null) {
      continue;
    }
    for (const quantile of Object.keys(metric.Data)) {
      metricData = metricData.concat(metric.Data[quantile]);
    }
    const max = d3.max(d3.map(metricData, (d) => d._value)) ?? 0;
    const maxPrefix = new Unit(max, metric.Config.Unit).bestPrefix();
    let yDomain: [number, number] | undefined = undefined;
    if (!autoScale) {
      const max = metric.Config.MaxPerNode;
      if (max !== 0) {
        yDomain = [0, max];
      }
    } else {
      yDomain = [0, max];
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
          x={(d: QuantilePoint) => new Date(d._time)}
          y={(d: QuantilePoint) => d._value ?? 0}
          z={(d: QuantilePoint) => d._field}
          xDomain={xDomain}
          setTimeRange={setTimeRange}
          width={document.body.clientWidth / 2}
          title={((unitStr: string, maxPrefix?: string) => {
            return (d: QuantilePoint) =>
              `${d._field}: ${new Unit(d._value, unitStr).toString(maxPrefix)}`;
          })(metric.Config.Unit, maxPrefix)}
          unit={metric.Config.Unit}
          chartTitle={metric.Config.DisplayName}
          showTooltipSum={false}
          showTooltipMean={false}
          yDomain={yDomain}
        />
      </Flex>
    );
  }
  return <Grid templateColumns={"repeat(" + numColumns + ", 1fr)"}>{chartElements}</Grid>;
};

export default QuantileDataCharts;
