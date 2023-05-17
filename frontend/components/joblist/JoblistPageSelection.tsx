import {ArrowBackIcon, ArrowForwardIcon, ArrowLeftIcon, ArrowRightIcon} from "@chakra-ui/icons";
import { Button, Center, IconButton, Stack } from "@chakra-ui/react";
import React from "react";

interface JoblistPageSelectionProps {
  currentPage: number;
  pages: number;
  setPage: (p: number) => void;
  marginTopEnable?: boolean
  margiBottomEnable?: boolean
}

/**
 * Returns a react-fragment to select pages.
 * Pages need to have a number in [1, pages]
 * @param currentPage The currently selected page
 * @param pages The number of available pages
 * @param setPage The callback-function to set a selected page.
 * @param marginTopEnable Enabling a margin at the top.
 * @param margiBottomEnable Enabling a margin at the bottom
 */
export const JoblistPageSelection = ({
  currentPage,
  pages,
  setPage,
  marginTopEnable = false,
  margiBottomEnable = false,
}: JoblistPageSelectionProps) => {
  return (
    <Center mt={(marginTopEnable) ? 5 : 0} mb={(margiBottomEnable) ? 5 : 0} >
      <Stack direction="row">
        <IconButton
          isDisabled={currentPage <= 1}
          aria-label="first"
          icon={<ArrowLeftIcon />}
          onClick={() => setPage(1)}
        ></IconButton>
        <IconButton
          isDisabled={currentPage <= 1}
          aria-label="backward"
          icon={<ArrowBackIcon />}
          onClick={() => setPage(currentPage - 1)}
        ></IconButton>

        {currentPage - 2 >= 1 ? (
          <Button colorScheme="gray" onClick={() => setPage(currentPage - 2)}>{currentPage - 2}</Button>
        ) : null}
        {currentPage - 1 >= 1 ? (
          <Button colorScheme="gray" onClick={() => setPage(currentPage - 1)}>{currentPage - 1}</Button>
        ) : null}
        <Button colorScheme="teal">{currentPage} of {pages}</Button>
        {currentPage + 1 <= pages ? (
            <Button colorScheme="gray" onClick={() => setPage(currentPage + 1)}>{currentPage + 1}</Button>
        ) : null}
        {currentPage + 2 <= pages ? (
            <Button colorScheme="gray" onClick={() => setPage(currentPage + 2)}>{currentPage + 2}</Button>
        ) : null}


        <IconButton
          isDisabled={currentPage >= pages}
          aria-label="forward"
          icon={<ArrowForwardIcon />}
          onClick={() => setPage(currentPage + 1)}
        ></IconButton>
        <IconButton
          isDisabled={currentPage >= pages}
          aria-label="last"
          icon={<ArrowRightIcon />}
          onClick={() => setPage(pages)}
        ></IconButton>
      </Stack>
    </Center>
  );
};

export default JoblistPageSelection;
