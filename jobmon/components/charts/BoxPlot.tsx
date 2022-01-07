/* eslint-disable react-hooks/exhaustive-deps */
import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { Unit } from "../../types/units";

export interface BoxPlotProps<T> {
  data: T[];
  x?: (d: T) => number; // given d in data, returns the (quantitative) x-value
  y?: (d: T) => number; // given d in data, returns the (quantitative) weight
  unit?: string;
  thresholds?: number; // approximate number of bins to generate, or threshold function
  marginTop?: number; // top margin, in pixels
  marginRight?: number; // right margin, in pixels
  marginBottom?: number; // bottom margin, in pixels
  marginLeft?: number; // left margin, in pixels
  width?: number; // outer width, in pixels
  height?: number; // outer height, in pixels
  xType?: d3.ScaleLinear<number, number, never>;
  xDomain?: [number, number]; // [xmin, xmax]
  setTimeRange?: (start: Date, end: Date) => void;
  xRange?: [number, number]; // [left, right]
  xLabel?: string; // a label for the x-axis
  xFormat?: (d: T) => string; // a format specifier string for the x-axis
  yDomain?: [number, number]; // [ymin, ymax]
  yRange?: [number, number]; // [bottom, top]
  yFormat?: string; // a format specifier string for the y-axis
  yLabel?: string; // a label for the y-axis
  yType?: d3.ScaleLinear<number, number, never>;
  stroke?: string; // stroke color of line
  inset?: number; // left and right inset
  insetLeft?: number; // inset left edge of bar
  insetRight?: number; // inset right edge of bar
  fill?: string; // fill color of boxes
  jitter?: number; // amount of random jitter for outlier dots, in pixels
  autoScale?: boolean;
}

// Typescript version based on chart released under:
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/box-plot
export function BoxPlot<T>({
  data,
  x = () => 1, // given d in data, returns the (quantitative) x-value
  y = () => 1, // given d in data, returns the (quantitative) weight
  unit = "",
  thresholds = 5, // approximate number of bins to generate, or threshold function
  marginTop = 20, // top margin, in pixels
  marginRight = 10, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 80, // left margin, in pixels
  width = 640, // outer width of chart, in pixels
  height = 400, // outer height of chart, in pixels
  inset = 0.5, // left and right inset
  insetLeft = 0.5, // inset left edge of bar
  insetRight = 0.5, // inset right edge of bar
  xDomain, // [xmin, xmax]
  xRange = [marginLeft, width - marginRight], // [left, right]
  xLabel = "", // a label for the x-axis
  xFormat, // a format specifier string for the x-axis
  yDomain, // [ymin, ymax]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
  yLabel = "", // a label for the y-axis
  yFormat = "", // a format specifier string for the y-axis
  stroke = "currentColor", // stroke color of whiskers, median, outliers
  fill = "#ddd", // fill color of boxes
  jitter = 4, // amount of random jitter for outlier dots, in pixels
  autoScale = true,
}: BoxPlotProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    const X = d3.map(data, x);
    const Y = d3.map(data, y);

    // Filter undefined values.
    const I = d3.range(X.length).filter((i) => !isNaN(X[i]) && !isNaN(Y[i]));

    interface ExtBin extends d3.Bin<number, number> {
      quartiles: number[];
      range: number[];
      outliers: number[];
    }

    // Compute the bins.
    const B = d3
      .bin()
      .thresholds(thresholds)
      .value((i) => X[i])(I)
      .map((bin) => {
        const y = (i: number) => Y[i];
        const min = d3.min(bin, y) ?? 0;
        const max = d3.max(bin, y) ?? 0;
        const q1 = d3.quantile(bin, 0.25, y) ?? 0;
        const q2 = d3.quantile(bin, 0.5, y) ?? 0;
        const q3 = d3.quantile(bin, 0.75, y) ?? 0;
        const iqr = q3 - q1; // interquartile range
        const r0 = Math.max(min, q1 - iqr * 1.5);
        const r1 = Math.min(max, q3 + iqr * 1.5);
        let b = bin as ExtBin;
        b.quartiles = [q1, q2, q3];
        b.range = [r0, r1];
        b.x0 = 0.25;
        b.x1 = 0.75;
        b.outliers = bin.filter((i) => Y[i] < r0 || Y[i] > r1);
        return b;
      });

    // Compute default domains.
    if (xDomain === undefined) xDomain = [0, 1];
    if (yDomain === undefined || yDomain[1] === 0 || autoScale)
      yDomain = [
        (d3.min(I, (d) => Y[d]) ?? 0) * 0.85,
        (d3.max(I, (d) => Y[d]) ?? 0) * 1.15,
      ];

    // Construct scales and axes.
    const xScale = d3
      .scaleLinear(xDomain, xRange)
      .interpolate(d3.interpolateRound);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const xAxis = d3.axisBottom(xScale).ticks(0, xFormat).tickSizeOuter(0);
    const yAxis = d3
      .axisLeft<number>(yScale)
      .ticks(height / 40)
      .tickFormat((val) => new Unit(val, unit).toString());

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

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
          .text(yLabel)
      );

    const g = svg.append("g").selectAll("g").data(B).join("g");

    g.append("path")
      .attr("stroke", stroke)
      .attr(
        "d",
        (d) => `
        M${xScale(((d.x0 ?? 0) + (d.x1 ?? 0)) / 2)},${yScale(d.range[1])}
        V${yScale(d.range[0])}
      `
      );

    g.append("path")
      .attr("fill", fill)
      .attr(
        "d",
        (d) => `
        M${xScale(d.x0 ?? 0) + insetLeft},${yScale(d.quartiles[2])}
        H${xScale(d.x1 ?? 0) - insetRight}
        V${yScale(d.quartiles[0])}
        H${xScale(d.x0 ?? 0) + insetLeft}
        Z
      `
      );

    g.append("path")
      .attr("stroke", stroke)
      .attr("stroke-width", 2)
      .attr(
        "d",
        (d) => `
        M${xScale(d.x0 ?? 0) + insetLeft},${yScale(d.quartiles[1])}
        H${xScale(d.x1 ?? 0) - insetRight}
      `
      );

    g.append("g")
      .attr("fill", stroke)
      .attr("fill-opacity", 0.4)
      .attr("stroke", "none")
      .attr(
        "transform",
        (d) => `translate(${xScale(((d.x0 ?? 0) + (d.x1 ?? 0)) / 2)},0)`
      )
      .selectAll("circle")
      .data((d) => d.outliers)
      .join("circle")
      .attr("r", 2)
      .attr("cx", () => (Math.random() - 0.5) * jitter)
      .attr("cy", (i) => yScale(Y[i]));

    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(xAxis)
      .call((g) =>
        g
          .append("text")
          .attr("x", width)
          .attr("y", marginBottom - 4)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text(xLabel)
      );

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data, svgRef]);

  return <svg ref={svgRef} />;
}
