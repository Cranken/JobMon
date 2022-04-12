/* eslint-disable react-hooks/exhaustive-deps */
import * as d3 from "d3";
import React, { useEffect, useState } from "react";
import { useRef } from "react";
import { isDate } from "util";
import { Unit } from "../../types/units";
import { checkBetween, clamp } from "./../../utils/utils";

export interface LineChartProps<T> {
  data: T[];
  x?: (d: T) => Date; // given d in data, returns the (temporal) x-value
  y?: (d: T) => number; // given d in data, returns the (quantitative) y-value,
  z?: (d: T) => string;
  title?: (d: T) => string;
  unit?: string;
  defined?: (d: T, index: number, data: Iterable<T>) => boolean; // for gaps in data
  curve?: d3.CurveFactory; // method of interpolation between points
  marginTop?: number; // top margin, in pixels
  marginRight?: number; // right margin, in pixels
  marginBottom?: number; // bottom margin, in pixels
  marginLeft?: number; // left margin, in pixels
  width?: number; // outer width, in pixels
  height?: number; // outer height, in pixels
  xDomain?: [Date, Date]; // [xmin, xmax]
  setTimeRange?: (start: Date, end: Date) => void;
  xRange?: [number, number]; // [left, right]
  yDomain?: [number, number]; // [ymin, ymax]
  yRange?: [number, number]; // [bottom, top]
  yFormat?: string; // a format specifier string for the y-axis
  yLabel?: string; // a label for the y-axis
  zDomain?: (string | number)[]; // array of z-values
  color?: string; // stroke color of line
  strokeLinecap?: string; // stroke line cap of the line
  strokeLinejoin?: string; // stroke line join of the line
  strokeWidth?: number; // stroke width of line, in pixels
  strokeOpacity?: number; // stroke opacity of line
  mixBlendMode?: string;
  colors?: string[] | readonly string[];
  fill?: string; // Fill area between fillBoundKeys
  fillBoundKeys?: [string, string]; // Fill the area between [lower, upper]
  showTooltipMean?: boolean;
  showTooltipSum?: boolean;
}

// Typescript version based on chart released under:
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/line-chart

/**
 * Renders a line chart based on the given data
 * @param data - Array of data to be displayed. If multiple lines should be drawn, this parameter is the concatenation of the data of the individual lines
 * @param x - Mapping function of data value to Date object
 * @param y - Mapping function of data value to quantitative y-value
 * @param z - Mapping function to differentiate the lines based on the data value objects
 * @param title - Mapping function of data value to tooltip string
 *
 */
export function LineChart<T>({
  data,
  x = (_) => new Date(), // given d in data, returns the (temporal) x-value
  y = (_) => 0, // given d in data, returns the (quantitative) y-value
  z = (_) => "default",
  title = (_) => "",
  unit,
  defined, // for gaps in data
  curve = d3.curveLinear, // method of interpolation between points
  marginTop = 20, // top margin, in pixels
  marginRight = 10, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 90, // left margin, in pixels
  width = 1200, // outer width, in pixels
  height = 400, // outer height, in pixels
  xDomain, // [xmin, xmax]
  setTimeRange,
  xRange = [marginLeft, width - marginRight], // [left, right]
  yDomain, // [ymin, ymax]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
  yFormat, // a format specifier string for the y-axis
  yLabel = "Metric Data", // a label for the y-axis
  zDomain, // array of z-values
  color = "currentColor", // stroke color of line
  strokeLinecap = "round", // stroke line cap of the line
  strokeLinejoin = "round", // stroke line join of the line
  strokeWidth = 1.5, // stroke width of line, in pixels
  strokeOpacity = 1, // stroke opacity of line
  mixBlendMode = "multiply", // blend mode of lines
  colors = d3.schemeTableau10, // array of categorical colors
  fill = "#ff000020",
  fillBoundKeys,
  showTooltipMean = true,
  showTooltipSum = false,
}: LineChartProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    const bbox = svgRef.current.getBoundingClientRect();
    width = bbox.width;
    xRange = [marginLeft, width - marginRight]; // [left, right]

    // Filter data based on given time range
    let filteredData = data;
    if (xDomain && xDomain.length === 2 && filteredData.length > 0) {
      const firstDate = x(filteredData[0]);
      const lastDate = x(filteredData[filteredData.length - 1]);
      xDomain[0] = xDomain[0] >= firstDate ? xDomain[0] : firstDate;
      xDomain[1] = xDomain[1] <= lastDate ? xDomain[1] : lastDate;
      filteredData = filteredData.filter((dat) =>
        checkBetween(
          xDomain?.[0] ?? x(filteredData[0]),
          xDomain?.[1] ?? x(filteredData[data.length - 1]),
          x(dat)
        )
      );
    }

    // Compute data
    const X = d3.map(filteredData, x);
    const Y = d3.map(filteredData, y);
    const Z = d3.map(filteredData, z);
    if (defined === undefined) defined = (_, index) => !isNaN(Y[index]);
    const D = d3.map(filteredData, defined);

    // Compute default domains.
    if (xDomain === undefined) xDomain = d3.extent(X) as [Date, Date];
    if (yDomain === undefined) yDomain = [0, d3.max(Y) ?? 1];
    if (zDomain === undefined) zDomain = Z;
    const zSet = new d3.InternSet(zDomain);
    const linePointCount = Math.floor(filteredData.length / zSet.size);

    const I = d3.range(X.length).filter((i) => zSet.has(Z[i]));

    let prefix: string | undefined;
    if (yDomain) {
      prefix = new Unit(yDomain[1], unit ?? "").bestPrefix();
    }

    // Construct scales and axes.
    const xScale = d3.scaleUtc(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const colorFn = d3.scaleOrdinal(zDomain, colors);
    const xAxis = d3
      .axisBottom<Date>(xScale)
      // .ticks(width / 80)
      .tickSizeOuter(0)
      .tickFormat((val) => val.toLocaleTimeString());
    const yAxis = d3
      .axisLeft<number>(yScale)
      .ticks(height / 40)
      .tickFormat((val) => new Unit(val, unit ?? "").toString(prefix));

    // Construct a line generator.
    const line = d3
      .line<number>()
      .defined((_, index) => D[index])
      .curve(curve)
      .x((index) => xScale(X[index]))
      .y((index) => yScale(Y[index]));

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .on("pointermove", pointermoved)
      .on("pointerleave", pointerleft)
      .on("touchstart", (event) => event.preventDefault());

    const getNearestPointIdx = (pos: number) =>
      d3.least(d3.range(linePointCount), (i) => Math.hypot(xScale(X[i]) - pos));

    let dragStart = 0;
    let dragEnd = 0;
    const svgXOffset = width - svgRef.current.getBoundingClientRect().width;
    const drag = d3
      .drag<SVGSVGElement, unknown>()
      .on("start", (event: DragEvent) => {
        dragStart = clamp(event.x, xRange[0], xRange[1]);
        dragEnd = clamp(event.x, xRange[0], xRange[1]);
      })
      .on("drag", (event: DragEvent) => {
        dragEnd = clamp(event.x, xRange[0], xRange[1]);
        svg.selectChild("rect").remove();
        svg
          .append("rect")
          .attr(
            "transform",
            `translate(${
              dragStart < dragEnd ? dragStart : dragEnd
            }, ${marginTop})`
          )
          .attr("width", Math.abs(dragStart - dragEnd))
          .attr("height", height - marginTop - marginBottom)
          .attr("fill", "rgba(0,0,0,0.3)")
          .lower();
      })
      .on("end", (event: DragEvent) => {
        dragEnd = clamp(event.x, xRange[0], xRange[1]);
        svg.selectChild("rect").remove();
        const startIdx = getNearestPointIdx(dragStart);
        const endIdx = getNearestPointIdx(dragEnd);
        if (setTimeRange && startIdx && endIdx) {
          setTimeRange(X[startIdx], X[endIdx]);
        }
      });
    svg.call(drag);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(xAxis);

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
          .attr("x", -marginLeft + 5)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text(yLabel)
      );

    if (fillBoundKeys) {
      const range = d3.range(linePointCount);
      const lower = I.filter((i) => Z[i] === fillBoundKeys[0]);
      const upper = I.filter((i) => Z[i] === fillBoundKeys[1]);
      const area = d3
        .area<number>()
        .defined((_, index) => D[index])
        .x((index) => xScale(X[index]))
        .y0((index) => yScale(Y[lower[index]]))
        .y1((index) => yScale(Y[upper[index]]));

      svg
        .append("g")
        .attr("fill", fill)
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-linecap", strokeLinecap)
        .attr("stroke-linejoin", strokeLinejoin)
        .attr("stroke-opacity", strokeOpacity)
        .style("overflow-x", "scroll")
        .selectAll("path")
        .data(d3.group(range, (i) => Z[i]))
        .join("path")
        .attr("stroke", (_, I) => colorFn(I))
        .attr("d", ([_, I]) => area(I));
    }

    const path = svg
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(d3.group(I, (i) => Z[i]))
      .join("path")
      .attr("stroke", (_, I) => colorFn(I))
      .attr("d", ([_, I]) => line(I));

    const ruler = svg.append("g");

    ruler
      .append("line")
      .attr("y1", marginTop)
      .attr("y2", height - marginBottom);

    const tooltip = svg
      .append("g")
      .style("display", "none")
      .style("pointer-events", "none")
      .style("color", "white");

    function pointermoved(event: PointerEvent) {
      const [xm, ym] = d3.pointer(event);
      const i = getNearestPointIdx(xm); // closest point
      if (i === undefined) {
        return;
      }

      tooltip.selectAll("*").remove();

      // Values of the lines
      let values = [];
      let lastY = 0;
      for (let idx = zSet.size - 1; idx >= 0; idx--) {
        values.push(filteredData[idx * linePointCount + i]);
      }
      values.sort((a, b) => (y(a) < y(b) ? -1 : 1));

      const addLine = (str: string) => {
        const text = tooltip
          .append("text")
          .text(str)
          .attr("transform", `translate(0, ${lastY})`);
        lastY -= text.node()?.getBBox().height ?? 0;
      };

      if (showTooltipMean || showTooltipSum) {
        const pointValues = values.map((a) => y(a));
        if (showTooltipMean) {
          const mean = d3.mean(pointValues);
          addLine(
            `Mean: ${mean ? new Unit(mean, unit ?? "").toString(prefix) : 0}`
          );
        }

        if (showTooltipSum) {
          const sum = d3.sum(pointValues);
          addLine(`Sum: ${new Unit(sum, unit ?? "").toString(prefix)}`);
        }
      }
      if (values.length > 6) {
        for (let idx = 0; idx < 6; idx++) {
          const val = idx < 3 ? values[idx] : values[values.length + idx - 6];
          if (!val) {
            continue;
          }

          if (idx === 3) {
            addLine(`[${values.length - 10} more hidden]`);
          }

          let tooltipText = title(val);
          addLine(tooltipText);
        }
      } else {
        for (let idx = 0; idx < values.length; idx++) {
          let tooltipText = title(values[idx]);
          addLine(tooltipText);
        }
      }

      // Timestamp of current point
      addLine(X[i].toLocaleString());

      // Layout & positioning
      tooltip.selectAll("text").attr("fill", "currentcolor");
      const tooltipWidth = tooltip.node()?.getBBox().width ?? 0;
      const tooltipHeight = tooltip.node()?.getBBox().height ?? 0;
      const svgLeft = svg.node()?.getBoundingClientRect().left ?? 0;
      const svgRight = svg.node()?.getBoundingClientRect().right ?? 0;
      let xPos = xm + 15;
      const yPos = Math.min(
        height - marginBottom - 5,
        Math.max(ym + tooltipHeight / zSet.size, marginTop + tooltipHeight - 5)
      );

      if (svgLeft + xPos + tooltipWidth + 10 > svgRight) {
        xPos = xm - 15 - tooltipWidth;
      }

      tooltip
        .style("display", null)
        .attr("transform", `translate(${xPos}, ${yPos})`)
        .append("rect")
        .attr("stroke", color)
        .attr("fill", "rgba(0,0,0,0.8)")
        .attr("width", tooltipWidth + 10)
        .attr("height", tooltipHeight)
        .attr("transform", `translate(-5, ${-tooltipHeight + 5})`)
        .lower();

      ruler
        .attr("transform", `translate(${xScale(X[i])}, 0)`)
        .attr("stroke", "currentColor");
    }

    function pointerleft() {
      ruler.attr("stroke", null);
      tooltip.style("display", "none");
    }

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data, svgRef]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}

export default LineChart;
