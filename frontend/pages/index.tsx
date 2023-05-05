import type { NextPage } from "next";
import React from "react";
import Jobs from "./jobs";

/**
 * Homepage component.
 * @returns the Jobs component which shows a list of jobs.
 */
const Home: NextPage = () => {
  return <Jobs />;
};
export default Home;
