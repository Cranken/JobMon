import { Box, Grid, GridItem, Heading, Spinner, useColorModeValue } from "@chakra-ui/react";
import React from "react";

/**
 * Categories for the search results
 */
export enum SearchResultsCategories {
    All = "All",
    Users = "Users",
    Jobs = "Jobs",
}

/**
 * SearchSelectionCategory describes a category in the selection menu.
 */
export interface SearchSelectionCategory {
    /**
     * The name of the category.
     */
    category: SearchResultsCategories;

    /**
     * A callback function to select this category.
     */
    select: () => void;

    /**
     * The number of items available in this selection.
     */
    number: number;

    /**
     * A boolean to determine whether the values are still loading
     */
    isLoading?: boolean
}

/**
 * Properties for the {@link SearchSelection}-Component.
 */
interface SearchSelectionProps {
    categories: SearchSelectionCategory[];
    activeCategory: SearchResultsCategories;
}

/**
 * SearchSelection is a component to let the user select the current category a search is performed in.
 * @param categories The categories for the user to select.
 */
export const SearchSelection = ({
    categories,
    activeCategory
}: SearchSelectionProps) => {
    const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    return (
        <Box
            w={"100%"}
            borderColor={borderColor}
            borderRadius={5}
            borderWidth={1}>
            <Heading>Categories</Heading>
            {categories.map((category: SearchSelectionCategory) => (
                <SearchSelectionItem
                    category={category}
                    key={category.category + "_category"}
                    active={category.category == activeCategory}
                />
            ))}
        </Box>
    );
};

export default SearchSelection

/**
 * Properties for the {@link SearchSelectionItem}-Component.
 */
interface SearchSelectionItemProps {
    category: SearchSelectionCategory;
    active: boolean;
}

/**
 * SearchSelectionItem is a React Fragment for an item in the {@link SearchSelection}.
 * @param category The category to display in the item.
 */
const SearchSelectionItem = ({ category, active }: SearchSelectionItemProps) => {
    const activeColor = useColorModeValue("gray.300", "whiteAlpha.400");
    return (
        <Grid
        templateColumns={"repeat(2, 1fr)"}
        gap={1}
        w={"100%"}
        onClick={category.select}
        bg={active ? activeColor : undefined}
        borderRadius={5}
        p={1}>
            <GridItem>{category.category}</GridItem>
            <GridItem justifySelf={"end"}>{category.isLoading ? <Spinner /> : category.number}</GridItem>
        </Grid>
    );
};
