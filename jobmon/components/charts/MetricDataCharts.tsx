import { MetricData, MetricPoint } from "../../types/job";
import { LineChart } from "./LineChart";

interface MetricDataChartsProps {
  metrics: MetricData[] | undefined;
  nodeSelection: string[];
  startTime?: Date;
  stopTime?: Date;
  setTimeRange?: (start: Date, end: Date) => void;
}

export const MetricDataCharts = ({
  metrics,
  nodeSelection,
  startTime,
  stopTime,
  setTimeRange,
}: MetricDataChartsProps) => {
  if (!metrics) {
    return <div>No metrics</div>;
  }
  const xDomain: [Date, Date] = [
    startTime || new Date(0),
    stopTime || new Date(),
  ];
  let chartElements = [];
  const sortedMetrics = metrics.sort((a, b) =>
    a.Config.Measurement < b.Config.Measurement ? 1 : -1
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
      title = (d: MetricPoint) => `${d["type-id"]}: ${d._value.toString(2)}`;
      for (const node of Object.keys(metric.Data)) {
        metricData = metricData.concat(metric.Data[node]);
      }
    } else {
      z = (d: MetricPoint) => d["hostname"];
      title = (d: MetricPoint) => `${d["hostname"]}: ${+d._value.toFixed(2)}`;
      for (const node of Object.keys(metric.Data)) {
        if (nodeSelection.indexOf(node) > -1) {
          metricData = metricData.concat(metric.Data[node]);
        }
      }
    }

    chartElements.push(
      <LineChart
        key={metric.Config.Measurement}
        data={metricData}
        x={(d: MetricPoint) => new Date(d._time)}
        y={(d: MetricPoint) => d._value}
        z={z}
        xDomain={xDomain}
        setTimeRange={setTimeRange}
        width={document.body.clientWidth / 2 - 50}
        title={title}
        unit={metric.Config.Unit}
        yLabel={metric.Config.Measurement}
      />
    );
  }
  return <div>{chartElements}</div>;
};

export default MetricDataCharts;
