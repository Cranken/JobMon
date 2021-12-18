import { QuantileData } from "../../types/job";
import { LineChart } from "./LineChart";
import { QuantilePoint } from "./../../types/job";

interface QuantileDataChartsProps {
  quantiles: QuantileData[] | undefined;
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
}

export const QuantileDataCharts = ({
  quantiles,
  startTime,
  stopTime,
  setTimeRange,
}: QuantileDataChartsProps) => {
  if (!quantiles) {
    return <div>No quantiles</div>;
  }
  const xDomain: [Date, Date] = [
    startTime || new Date(0),
    stopTime || new Date(),
  ];
  let chartElements = [];
  for (const metric of quantiles) {
    let metricData: QuantilePoint[] = [];
    if (metric.Data === null) {
      continue;
    }
    for (const quantile of Object.keys(metric.Data)) {
      metricData = metricData.concat(metric.Data[quantile]);
    }

    chartElements.push(
      <LineChart
        key={metric.Config.Measurement}
        data={metricData}
        x={(d: QuantilePoint) => new Date(d._time)}
        y={(d: QuantilePoint) => d._value}
        z={(d: QuantilePoint) => d._field}
        xDomain={xDomain}
        setTimeRange={setTimeRange}
        // xDomain={
        //   metricData.length > 1
        //     ? [
        //         new Date(
        //           new Date(metricData[0]._time).getTime() + 30 * 60 * 1000
        //         ),
        //         new Date(),
        //       ]
        //     : undefined
        // }
        width={document.body.clientWidth / 2 - 50}
        title={(d: QuantilePoint) => `${d._field}: ${d._value.toString()}`}
        unit={metric.Config.Unit}
        yLabel={metric.Config.Measurement}
      />
    );
  }
  return <div>{chartElements}</div>;
};

export default QuantileDataCharts;
