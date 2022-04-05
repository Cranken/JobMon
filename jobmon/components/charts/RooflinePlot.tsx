/* eslint-disable react-hooks/exhaustive-deps */
import * as d3 from "d3";
import React, { useEffect } from "react";
import { useRef } from "react";
import { Unit } from "../../types/units";

export interface RooflinePlotProps {
  flops: number[]; // given d in data, returns the (temporal) x-value
  flops_max: number;
  flops_unit: string;
  mem_bw: number[]; // given d in data, returns the (quantitative) y-value,
  mem_bw_max: number;
  mem_bw_unit: string;
  marginTop?: number; // top margin, in pixels
  marginRight?: number; // right margin, in pixels
  marginBottom?: number; // bottom margin, in pixels
  marginLeft?: number; // left margin, in pixels
  width?: number; // outer width, in pixels
  height?: number; // outer height, in pixels
  xDomain?: [number, number]; // [xmin, xmax]
  xRange?: [number, number]; // [left, right]
  yDomain?: [number, number]; // [ymin, ymax]
  yRange?: [number, number]; // [bottom, top]
}

export function RooflinePlot({
  flops,
  flops_max,
  flops_unit,
  mem_bw,
  mem_bw_max,
  mem_bw_unit,
  marginTop = 30, // top margin, in pixels
  marginRight = 10, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 110, // left margin, in pixels
  width = 1200, // outer width, in pixels
  height = 400, // outer height, in pixels
  xDomain, // [xmin, xmax]
  xRange = [marginLeft, width - marginRight], // [left, right]
  yDomain, // [ymin, ymax]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
}: RooflinePlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!flops || !mem_bw || !svgRef.current) {
      return;
    }
    const bbox = svgRef.current.getBoundingClientRect();
    width = bbox.width;
    xRange = [marginLeft, width - marginRight]; // [left, right]

    // Compute data
    let opInt: number[] = [];
    let flop: number[] = [];
    flops.forEach((f, i) => {
      const m = mem_bw[i];
      if (isNaN(f) || isNaN(m)) {
        return;
      }
      const opIntensitiy = f / m;
      if (isNaN(opIntensitiy) || !isFinite(opIntensitiy)) {
        return;
      }
      opInt.push(opIntensitiy);
      flop.push(f);
    });

    // Compute default domains.
    if (xDomain === undefined)
      xDomain = [0.01, Math.max(d3.max(opInt) ?? 0, 100)];
    if (yDomain === undefined)
      yDomain = [10, Math.max(d3.max(flop) ?? 0, flops_max)];

    // Construct scales and axes.
    const xScale = d3.scaleLog(xDomain, xRange).nice();
    const yScale = d3.scaleLog(yDomain, yRange).nice();
    const xAxis = d3
      .axisBottom<number>(xScale)
      .ticks(3)
      .tickFormat((val) => val.toString());
    const yAxis = d3
      .axisLeft<number>(yScale)
      .ticks(5)
      .tickFormat((val) => new Unit(val, flops_unit ?? "").toString("giga"));

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
          .attr("x", width - marginRight)
          .attr("y", 27)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text("Operational Intensity [FLOP/Byte]")
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
          .attr("x", 0)
          .attr("y", marginTop / 2)
          .attr("fill", "currentColor")
          .attr("text-anchor", "middle")
          .text("Floating Point Operations per Second [FLOP/s]")
      );

    // Roof
    const kneeX = flops_max / mem_bw_max;
    if (!isNaN(kneeX) && isFinite(kneeX)) {
      // Bandwidth Limit
      svg
        .append("line")
        .attr("x1", xScale(xDomain[0]))
        .attr("x2", xScale(kneeX))
        .attr("y1", yScale(yDomain[0]))
        .attr("y2", yScale(flops_max))
        .attr("stroke", "currentColor");

      // FLOPs Limit
      svg
        .append("line")
        .attr("x1", xScale(kneeX))
        .attr("x2", width - marginRight)
        .attr("y1", yScale(flops_max))
        .attr("y2", yScale(flops_max))
        .attr("stroke", "currentColor");

      svg
        .append("line")
        .attr("x1", xScale(xDomain[0]))
        .attr("x2", xScale(kneeX))
        .attr("y1", yScale(flops_max))
        .attr("y2", yScale(flops_max))
        .attr("stroke", "currentColor")
        .attr("stroke-dasharray", "20");
    }

    flops.forEach((_, i) => {
      const x = Math.max(xScale(opInt.at(i) ?? 1), xScale(xDomain?.at(0) ?? 1));
      const y = Math.min(yScale(flop.at(i) ?? 1), yScale(yDomain?.at(0) ?? 1));
      svg
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 4)
        .attr("fill", "red")
        .attr("fill-opacity", "0.3");
    });

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [flops, mem_bw, svgRef]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}

export default RooflinePlot;
