import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

/**
 * Renders a histogram based on the given data
 * @param data - Array of data to be displayed
 * @param x - Mapping function of data value to quantitative x-value
 * @param y - Mapping function of data value to quantitative weight
 *
 */
export interface HistogramProps<T> {
  data: T[];
  x?: (d: T) => number; // given d in data, returns the (quantitative) x-value
  y?: (d: T) => number; // given d in data, returns the (quantitative) weight
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
  xFormat?: ((d: T) => string) | string; // a format specifier string for the x-axis
  yDomain?: [number, number]; // [ymin, ymax]
  yRange?: [number, number]; // [bottom, top]
  yFormat?: string; // a format specifier string for the y-axis
  yLabel?: string; // a label for the y-axis
  yType?: d3.ScaleLinear<number, number, never>;
  zDomain?: (string | number)[]; // array of z-values
  color?: string; // stroke color of line
  insetLeft?: number; // inset left edge of bar
  insetRight?: number; // inset right edge of bar
  normalize?: boolean;
}

// Typescript version based on chart released under:
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/histogram
export function Histogram<T>({
  data,
  x = () => 1, // given d in data, returns the (quantitative) x-value
  y = () => 1, // given d in data, returns the (quantitative) weight
  thresholds = 5, // approximate number of bins to generate, or threshold function
  marginTop = 20, // top margin, in pixels
  marginRight = 30, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 80, // left margin, in pixels
  width = 640, // outer width of chart, in pixels
  height = 400, // outer height of chart, in pixels
  insetLeft = 0.5, // inset left edge of bar
  xDomain, // [xmin, xmax]
  xRange = [marginLeft, width - marginRight], // [left, right]
  xLabel = "Bins", // a label for the x-axis
  yDomain, // [ymin, ymax]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
  yLabel = "Occurences", // a label for the y-axis
  yFormat = "d", // a format specifier string for the y-axis
  color = "currentColor", // bar fill color
  normalize = false,
}: HistogramProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    const X = d3.map(data, x);
    const Y0 = d3.map(data, y);
    const I = d3.range(X.length);

    const bins = d3
      .bin()
      .thresholds(thresholds)
      .value((i) => X[i])(I);
    const Y = Array.from(bins, (I) => d3.sum(I, (i) => Y0[i]));
    if (normalize) {
      const total = d3.sum(Y);
      for (let i = 0; i < Y.length; ++i) Y[i] /= total;
    }

    // Compute default domains.
    if (xDomain === undefined)
      xDomain = [bins[0].x0 ?? 0, bins[bins.length - 1].x1 ?? 1];
    if (yDomain === undefined) yDomain = [0, d3.max(Y) ?? 1];

    // Construct scales and axes.
    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(width / 80)
      .tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);

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

    svg
      .append("g")
      .attr("fill", color)
      .selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("transform", `translate(${marginTop + 50},0})`)
      .attr("x", (d) => xScale(d.x0 ?? 0) + insetLeft)
      .attr("width", (d) =>
        Math.max(
          0,
          xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - insetLeft - insetLeft
        )
      )
      .attr("y", (d) => yScale(d3.sum(d, (i) => Y[i])))
      .attr("height", (d) => yScale(0) - yScale(d3.sum(d, (i) => Y[i])))
      .append("title")
      .text((d, i) => [`${d.x0} ≤ x < ${d.x1}`, Y[i]].join("\n"));

    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(xAxis)
      .call((g) =>
        g
          .append("text")
          .attr("x", width - marginRight)
          .attr("y", 30)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text(xLabel)
      );

    svg.selectAll("text").attr("font-size", "120%");

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data, svgRef]);

  return <svg ref={svgRef} />;
}
