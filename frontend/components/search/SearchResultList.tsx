import { clamp, useIsWideDevice, useSessionStorageState } from "@/utils/utils";
import { Box, Heading, Text, Stack, useColorModeValue, LinkOverlay, LinkBox } from "@chakra-ui/react";
import React from "react";
import PageSelection from "../utils/PageSelection";
import CentredSpinner from "../utils/CentredSpinner";

/**
 * A search-result.
 */
export interface SearchResult {

    /**
     * The name of the result.
     */
    name: string;

    /**
     * A function to call to open the result
     */
    link: string;

    /**
     * The category the result is in.
     */
    category: string;

    /**
     * A text describing the result or giving a hint, why the result matches the search.
     */
    text?: string;
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
    const limit = 50;
    const [page, setPageStorage, , pageIsLoading] = useSessionStorageState("searchPage", 1)
    const pages = results.length / limit;
    const isWideDevice = useIsWideDevice();

    if (pageIsLoading) {
        return (
            <CentredSpinner />
        );
    }

    // Clamp page if page is to high or low
    if (!isNaN(pages) && isFinite(pages) && (page < 0 || Math.ceil(pages) < page)) {
        setPageStorage(clamp(page, 0, Math.ceil(pages)))
    }

    // Set page to 1. This case is necessary coming from a filter with zero jobs to a filter with more than zero jobs.
    if (page == 0 && pages > 0) {
        setPageStorage(1)
    }
    const resultsSliced = results.slice(limit * (page - 1), limit * (page - 1) + limit)
    return (
        <Stack w={"100%"}>
            {pages > 1 ? (
                <PageSelection
                    key="pageselection_top"
                    currentPage={page}
                    pages={!isNaN(pages) && isFinite(pages) ? Math.ceil(pages) : 1}
                    setPage={setPageStorage}
                    marginBottomEnable={true}
                    displayExtendedSelection={isWideDevice}
                ></PageSelection>
            ) : null}
            {resultsSliced.map((r: SearchResult) => (<SearchResultListItem item={r} key={"item_" + r.name + "_" + r.category} />))}
            {pages > 1 ? (
                <PageSelection
                    key="pageselection_end"
                    currentPage={page}
                    pages={!isNaN(pages) && isFinite(pages) ? Math.ceil(pages) : 1}
                    setPage={setPageStorage}
                    marginTopEnable={true}
                    displayExtendedSelection={isWideDevice}
                ></PageSelection>
            ) : null}
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
        <LinkBox>
            <LinkOverlay href={item.link}>
                <Box
                    w={"100%"}
                    borderColor={borderColor}
                    borderRadius={5}
                    borderWidth={1}
                    p={2}>
                    <Text>{item.category}</Text>
                    <Heading>{item.name}</Heading>
                    {item.text ? <Text>{item.text}</Text> : null}
                </Box>
            </LinkOverlay>
        </LinkBox>
    );
};
