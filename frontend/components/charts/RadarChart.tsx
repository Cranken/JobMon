import * as d3 from "d3";
import React, { useRef, useEffect } from "react";
import { clamp } from "@/utils/utils";

interface RadarChartProps<T> {
  data: T[];
  value: (d: T) => number;
  title: (d: T) => string;
  maxVal?: (d: T) => number;
  size?: number;
  margin: number;
  numSpirals?: number;
  stroke?: string;
}

/**
 * Renders a radar chart based on the given data
 * @param data - Array of values to be displayed
 * @param value - Mapping function which maps data to the mean values to be displayed
 * @param maxVal - Mapping function which maps data to the maximum values to be displayed
 *
 */
export function RadarChart<T>({
  data,
  value,
  title,
  maxVal,
  size = 350,
  margin = 80,
  numSpirals = 4,
  stroke = "currentColor",
}: RadarChartProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    const values = d3.map(data, value);
    const maxVals = maxVal ? d3.map(data, maxVal) : undefined;
    const titles = d3.map(data, title);

    const range = [margin, size - margin];
    const xScale = d3.scaleLinear([-1, 1], range);
    const yScale = d3.scaleLinear([-1, 1], range);

    const angles = d3.range(
      -Math.PI / 2,
      (3 / 2) * Math.PI,
      (2 * Math.PI) / values.length
    );

    const svg = d3
      .select(svgRef.current)
      .attr("width", size)
      .attr("height", size)
      .attr("viewBox", [0, 0, size, size])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    const xPos: number[] = [];
    const yPos: number[] = [];
    angles.forEach((angle, i) => {
      const val = clamp(values[i], 0, 1);

      const coord = [Math.cos(angle), Math.sin(angle)];
      xPos.push(val * coord[0]);
      yPos.push(val * coord[1]);

      // Axes
      svg
        .append("line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(coord[0]))
        .attr("y1", yScale(0))
        .attr("y2", yScale(coord[1]))
        .attr("stroke", stroke)
        .attr("stroke-opacity", "0.5");

      // Legend
      svg
        .append("text")
        .attr("x", xScale(0))
        .attr("y", yScale(0))
        .attr(
          "transform",
          `translate(${1.1 * (xScale(coord[0]) - xScale(0))}, ${1.1 * (yScale(coord[1]) - yScale(0))
          })`
        )
        .attr("text-anchor", "middle")
        .attr("fill", stroke)
        .attr("style", "font-size: 0.7em")
        .text(titles[i]);

      if (maxVals) {
        const val = clamp(maxVals[i], 0, 1);
        const coord = [Math.cos(angle), Math.sin(angle)];
        svg
          .append("circle")
          .attr("cx", xScale(val * coord[0]))
          .attr("cy", yScale(val * coord[1]))
          .attr("r", 3)
          .attr("fill", "#ff0000")
          .attr("fill-opacity", "1");
      }
    });

    // Spirals between axes
    for (let i = 1; i <= numSpirals; i++) {
      const scale = i / numSpirals;

      svg
        .append("path")
        .attr(
          "d",
          d3
            .line<number>()
            .curve(d3.curveLinearClosed)
            .x((angle) => xScale(scale * Math.cos(angle)))
            .y((angle) => yScale(scale * Math.sin(angle)))(angles)
        )
        .attr("fill", "none")
        .attr("stroke", stroke)
        .attr("stroke-opacity", "0.3");
      // .attr("stroke", "rgba(255,255,255,0.3)");
    }

    // Actual values
    svg
      .append("path")
      .attr(
        "d",
        d3
          .line<number>()
          .curve(d3.curveLinearClosed)
          .x((idx) => xScale(xPos[idx]))
          .y((idx) => yScale(yPos[idx]))(d3.range(xPos.length))
      )
      .attr("stroke", stroke)
      .attr("stroke-opacity", "0.3")
      .attr("fill", stroke)
      .attr("fill-opacity", "0.3");

    // Dot at end of lines
    for (let i = 0; i < values.length; i++) {
      svg
        .append("circle")
        .attr("cx", xScale(xPos[i]))
        .attr("cy", yScale(yPos[i]))
        .attr("r", 3)
        .attr("fill", stroke)
        .attr("fill-opacity", "0.8");
    }

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  });

  return <svg ref={svgRef} />;
}
