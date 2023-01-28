import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

export interface BarChartProps<T> {
  data: T[];
  column: (d: T) => string;
  value: (d: T) => number;
  columnLabel?: string;
  valueLabel?: string;
  marginTop?: number; // top margin, in pixels
  marginRight?: number; // right margin, in pixels
  marginBottom?: number; // bottom margin, in pixels
  marginLeft?: number; // left margin, in pixels
  width?: number; // outer width, in pixels
  height?: number; // outer height, in pixels
  xRange?: [number, number]; // [left, right]
  yRange?: [number, number]; // [bottom, top]
}

export function BarChart<T>({
  data,
  column,
  value,
  columnLabel = "",
  valueLabel = "",
  marginTop = 20, // top margin, in pixels
  marginRight = 10, // right margin, in pixels
  marginBottom = 40, // bottom margin, in pixels
  marginLeft = 90, // left margin, in pixels
  width = 1000, // outer width, in pixels
  height = 400, // outer height, in pixels
  xRange = [marginLeft, width - marginRight], // [left, right]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
}: BarChartProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    const columns = d3.map(data, column);
    const values = d3.map(data, value);

    const xDomain = new d3.InternSet(columns);
    const yDomain = [0, d3.max(values) ?? 1];
    const xScale = d3.scaleBand(xDomain, xRange).padding(0.1);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 40);

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(xAxis)
      .call((g) =>
        g
          .append("text")
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .attr("x", width - marginRight)
          .attr("y", marginBottom)
          .text(columnLabel)
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
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text(valueLabel)
      );

    svg
      .append("g")
      .attr("fill", "currentColor")
      .selectAll("rect")
      .data(d3.range(columns.length))
      .join("rect")
      .attr("x", (i) => xScale(columns[i]) ?? 0)
      .attr("y", (i) => yScale(values[i]))
      .attr("height", (i) => yScale(0) - yScale(values[i]))
      .attr("width", xScale.bandwidth())
      .append("title")
      .text((i) => values[i].toString());

    svg.selectAll("text").attr("font-size", "140%");

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data, svgRef]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
