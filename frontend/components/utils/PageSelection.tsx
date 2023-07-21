import {ArrowBackIcon, ArrowForwardIcon, ArrowLeftIcon, ArrowRightIcon} from "@chakra-ui/icons";
import { Button, Center, IconButton, Stack } from "@chakra-ui/react";
import React from "react";

interface PageSelectionProps {
  currentPage: number;
  pages: number;
  setPage: (p: number) => void;
  marginTopEnable?: boolean
  marginBottomEnable?: boolean
  displayExtendedSelection?: boolean
}

/**
 * Returns a react-fragment to select pages.
 * Pages need to have a number in [1, pages].
 * @param currentPage The currently selected page.
 * @param pages The number of available pages.
 * @param setPage The callback-function to set a selected page.
 * @param marginTopEnable Enabling a margin at the top.
 * @param marginBottomEnable Enabling a margin at the bottom.
 * @param displayExtendedSelection Enables a wider version of the page selector 
 */
export const PageSelection = ({
  currentPage,
  pages,
  setPage,
  marginTopEnable = false,
  marginBottomEnable = false,
  displayExtendedSelection = true,
}: PageSelectionProps) => {
  return (
    <Center mt={(marginTopEnable) ? 5 : 0} mb={(marginBottomEnable) ? 5 : 0} >
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

        {(displayExtendedSelection && currentPage - 2 >= 1) ? (
          <Button colorScheme="gray" onClick={() => setPage(currentPage - 2)}>{currentPage - 2}</Button>
        ) : null}
        {(displayExtendedSelection && currentPage - 1 >= 1) ? (
          <Button colorScheme="gray" onClick={() => setPage(currentPage - 1)}>{currentPage - 1}</Button>
        ) : null}
        <Button colorScheme="teal">{currentPage} of {pages}</Button>
        {(displayExtendedSelection && currentPage + 1 <= pages) ? (
            <Button colorScheme="gray" onClick={() => setPage(currentPage + 1)}>{currentPage + 1}</Button>
        ) : null}
        {(displayExtendedSelection && currentPage + 2 <= pages) ? (
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

export default PageSelection;
