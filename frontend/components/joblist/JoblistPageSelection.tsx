import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { Button, Center, IconButton, Stack } from "@chakra-ui/react";
import React from "react";

interface JoblistPageSelectionProps {
  currentPage: number;
  pages: number;
  setPage: (p: number) => void;
}

export const JoblistPageSelection = ({
  currentPage,
  pages,
  setPage,
}: JoblistPageSelectionProps) => {
  return (
    <Center mt={5}>
      <Stack direction="row">
        <IconButton
          disabled={currentPage <= 1}
          aria-label="backward"
          icon={<ChevronLeftIcon />}
          onClick={() => setPage(currentPage - 1)}
        ></IconButton>
        <Button
          colorScheme={currentPage === 1 ? "teal" : "gray"}
          onClick={() => setPage(1)}
        >
          1
        </Button>
        {currentPage !== 1 && currentPage !== pages ? (
          <Button colorScheme="teal">{currentPage}</Button>
        ) : null}
        {pages > 1 ? (
          <Button
            colorScheme={currentPage === pages ? "teal" : "gray"}
            onClick={() => setPage(pages)}
          >
            {pages}
          </Button>
        ) : null}
        <IconButton
          disabled={currentPage >= pages}
          aria-label="forward"
          icon={<ChevronRightIcon />}
          onClick={() => setPage(currentPage + 1)}
        ></IconButton>
      </Stack>
    </Center>
  );
};

export default JoblistPageSelection;
