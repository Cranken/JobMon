/* eslint-disable react-hooks/exhaustive-deps */
import * as d3 from "d3";
import { useRef, useEffect } from "react";

interface RadarChartProps<T> {
  data: T[];
  value: (d: T) => number;
  title: (d: T) => string;
  size?: number;
  margin: number;
  numSpirals?: number;
  stroke?: string;
}

/**
 * Renders a radar chart based on the given data
 * @param data - Array of data to be displayed
 * @param x - Mapping function of data value to quantitative value. Should be between [0,1], i.e. scaled between 0 and the maximum
 * @param y - Mapping function of data value to label
 *
 */
export function RadarChart<T>({
  data,
  value,
  title,
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

    let xPos: number[] = [];
    let yPos: number[] = [];
    angles.forEach((angle, i) => {
      const val = values[i];

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
      const text = svg
        .append("text")
        .attr("x", xScale(0))
        .attr("y", yScale(0))
        .attr(
          "transform",
          `translate(${1.1 * (xScale(coord[0]) - xScale(0))}, ${
            1.1 * (yScale(coord[1]) - yScale(0))
          })`
        )
        .attr("text-anchor", "middle")
        .attr("fill", stroke)
        .attr("style", "font-size: 0.7em")
        .text(titles[i]);
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
