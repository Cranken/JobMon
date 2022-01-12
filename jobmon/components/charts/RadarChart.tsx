/* eslint-disable react-hooks/exhaustive-deps */
import * as d3 from "d3";
import { useRef, useEffect } from "react";

interface RadarChartProps<T> {
  data: T[];
  value: (d: T) => number;
  title: (d: T) => string;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  numSpirals?: number;
}

export function RadarChart<T>({
  data,
  value,
  title,
  width = 1200,
  height = 1200,
  marginTop = 100,
  marginLeft = 100,
  marginRight = 100,
  marginBottom = 100,
  numSpirals = 4,
}: RadarChartProps<T>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) {
      return;
    }
    console.log(data);
    const values = d3.map(data, value);
    const titles = d3.map(data, title);

    const xRange = [marginLeft, width - marginRight];
    const yRange = [marginTop, height - marginBottom];
    const xScale = d3.scaleLinear([-1, 1], xRange);
    const yScale = d3.scaleLinear([-1, 1], yRange);

    const angles = d3.range(
      -Math.PI / 2,
      (3 / 2) * Math.PI,
      (2 * Math.PI) / values.length
    );

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
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
        .attr("stroke", "rgba(255,255,255,0.5)");

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
        .attr("fill", "currentColor")
        .attr("style", "font-size: 2em")
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
        .attr("stroke", "rgba(255,255,255,0.3)");
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
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("fill", "rgba(255,255,255,0.2)");

    // Dot at end of lines
    for (let i = 0; i < values.length; i++) {
      svg
        .append("circle")
        .attr("cx", xScale(xPos[i]))
        .attr("cy", yScale(yPos[i]))
        .attr("r", 7)
        .attr("fill", "rgba(255,255,255,0.8)");
    }

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  });

  return <svg ref={svgRef} />;
}
