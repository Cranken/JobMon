/* eslint-disable react-hooks/exhaustive-deps */
import { useColorModeValue } from "@chakra-ui/react";
import * as d3 from "d3";
import { NumberValue } from "d3";
import { useEffect, useRef } from "react";

export interface HorizontalBarChartProps<T> {
  data: T[];
  column: (d: T) => string;
  value: (d: T) => number;
  xLabel?: string;
  yLabel?: string;
  marginTop?: number; // top margin, in pixels
  marginRight?: number; // right margin, in pixels
  marginBottom?: number; // bottom margin, in pixels
  marginLeft?: number; // left margin, in pixels
  width?: number; // outer width, in pixels
  height?: number; // outer height, in pixels
  xRange?: [number, number]; // [left, right]
  xFormat?: (v: NumberValue) => string;
  barHeight?: number;
  valueFormat?: (d: T) => string;
}

export function HorizontalBarChart<T>({
  data,
  column,
  value,
  xLabel = "Frequency",
  yLabel = "Value",
  marginTop = 20, // top margin, in pixels
  marginRight = 10, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 120, // left margin, in pixels
  width = 1000, // outer width, in pixels
  height = 400, // outer height, in pixels
  xRange = [marginLeft, width - marginRight], // [left, right]
  xFormat,
  barHeight = 20,
  valueFormat,
}: HorizontalBarChartProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const textColor = useColorModeValue("white", "black");
  const altColor = useColorModeValue("black", "white");

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    const columns = d3.map(data, column);
    const values = d3.map(data, value);
    let labels: string[];
    if (valueFormat) {
      labels = d3.map(data, valueFormat);
    } else {
      labels = d3.map(values, (val) => val.toString());
    }

    height = barHeight * columns.length + marginTop + marginBottom;

    const xDomain = [0, d3.max(values) ?? 1];
    const yDomain = new d3.InternSet(columns);
    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleBand(yDomain, [marginTop, height]).padding(0.1);
    let xAxis = d3.axisTop(xScale).ticks(width / 80);
    const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);

    if (xFormat) {
      xAxis = xAxis.tickFormat(xFormat);
    }

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    const xElem = svg
      .append("g")
      .attr("transform", `translate(0,${marginTop})`)
      .call(xAxis)
      .call((g) =>
        g
          .append("text")
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .attr("x", marginLeft - 5)
          .attr("y", -10)
          .text(xLabel + "→")
      );

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1)
      )
      .call((g) =>
        g
          .append("text")
          .attr("x", -marginLeft)
          .attr("y", 20)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↓" + yLabel)
      );

    svg
      .append("g")
      .attr("fill", "currentColor")
      .selectAll("rect")
      .data(d3.range(columns.length))
      .join("rect")
      .attr("x", xScale(0))
      .attr("y", (i) => yScale(columns[i]) ?? 1)
      .attr("height", barHeight)
      .attr("width", (i) => xScale(values[i]) - xScale(0));

    svg
      .append("g")
      .attr("fill", textColor)
      .attr("text-anchor", "end")
      .attr("font-size", 14)
      .selectAll("text")
      .data(d3.range(columns.length))
      .join("text")
      .attr("x", (i) => xScale(values[i]))
      .attr("y", (i) => (yScale(columns[i]) ?? 1) + barHeight / 2)
      .attr("dx", -4)
      .attr("dy", "0.35em")
      .text((i) => labels[i])
      .call((text) =>
        text
          .filter(
            (i) =>
              xScale(values[i]) - xScale(0) <
              Math.max(labels[i].length * 10, 20)
          )
          .attr("dx", +4)
          .attr("fill", altColor)
          .attr("text-anchor", "start")
      );

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data, svgRef, textColor, altColor]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
