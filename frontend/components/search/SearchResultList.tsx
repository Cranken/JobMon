import { Box, Heading, Stack, useColorModeValue } from "@chakra-ui/react";
import React from "react";

/**
 * A search-result.
 */
interface SearchResult {

    /**
     * The name of the result.
     */
    name: string;

    /**
     * A function to call to open the result
     */
    open: () => void;

    /**
     * The category the result is in.
     */
    category: string;

    /**
     * A text describing the result or giving a hint, why the result matches the search.
     */
    text: string;
}

/**
 * Properties for the {@link SearchResultList}-Component.
 */
interface SearchResultListProps {
    results: SearchResult[];
}

/**
 * SearchResultList is a Component to display the results of a search
 * @param results The results to display in the list
 */
export const SearchResultList = ({
    results
}: SearchResultListProps) => {
    const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    return (
        <Stack w={"100%"}>
        {results.map((r: SearchResult) => (<SearchResultListItem item={r} />))}
        </Stack>
    );
};

export default SearchResultList

/**
 * Properties for the {@link SearchResultListItem}-Component.
 */
interface SearchResultListItemProps {
    item: SearchResult;
}

/**
 * Component representing an item in a list of search results.
 * @param item The item to display. 
 */
const SearchResultListItem = ({
    item
}: SearchResultListItemProps) => {
    const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    return (
        <Box
            w={"100%"}
            borderColor={borderColor}
            borderRadius={5}
            borderWidth={1}>
            <Heading>TODO</Heading>
        </Box>
    );
};
