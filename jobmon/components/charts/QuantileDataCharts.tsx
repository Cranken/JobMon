import { QuantileData } from "../../types/job";
import { LineChart } from "./LineChart";
import { QuantilePoint } from "./../../types/job";
import { Center, Container, Flex, Grid, Spinner } from "@chakra-ui/react";
import { Unit } from "./../../types/units";

interface QuantileDataChartsProps {
  quantiles: QuantileData[] | undefined;
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
  isLoading: boolean;
}

export const QuantileDataCharts = ({
  quantiles,
  startTime,
  stopTime,
  setTimeRange,
  isLoading,
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
  let chartElements = [];
  const sortedMetrics = quantiles.sort((a, b) =>
    a.Config.Measurement < b.Config.Measurement ? -1 : 1
  );
  for (const metric of sortedMetrics) {
    let metricData: QuantilePoint[] = [];
    if (metric.Data === null) {
      continue;
    }
    for (const quantile of Object.keys(metric.Data)) {
      metricData = metricData.concat(metric.Data[quantile]);
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
          y={(d: QuantilePoint) => d._value}
          z={(d: QuantilePoint) => d._field}
          xDomain={xDomain}
          setTimeRange={setTimeRange}
          width={document.body.clientWidth / 2}
          title={((unitStr: string) => {
            return (d: QuantilePoint) =>
              `${d._field}: ${new Unit(d._value, unitStr).toString()}`;
          })(metric.Config.Unit)}
          unit={metric.Config.Unit}
          yLabel={metric.Config.DisplayName}
          showTooltipSummary={false}
        />
      </Flex>
    );
  }
  return <Grid templateColumns={"repeat(2, 1fr)"}>{chartElements}</Grid>;
};

export default QuantileDataCharts;
