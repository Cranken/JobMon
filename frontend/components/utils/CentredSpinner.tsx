import React from "react";
import { JobMonAppContext } from "@/pages/_app";
import { Center, Spinner } from "@chakra-ui/react";

interface CentredSpinnerProps {
  size?: string
}

/**
 * CentredSpinner is a component used to display a spinner that is horizontally and vertically centred.
 * This components reads the hight of the header and displays a spinner centred in the remaining space.
 * 
 * @param size Per default the size is set to "lg". With this parameter, you can determine the size of the spinner
 * @returns The component
 */
export const CentredSpinner = ({size = "lg"}: CentredSpinnerProps) => (
  <JobMonAppContext.Consumer>
    {(value: { headerHeight: number; setHeaderHeight: (n: number) => void; }) => (
      <Center h={'calc(100vh - ' + value.headerHeight + 'px)'} >
        <Spinner size={size} />
      </Center>
    )}
  </JobMonAppContext.Consumer>
);

export default CentredSpinner;