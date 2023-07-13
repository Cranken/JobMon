import { Box, Grid, GridItem, Heading, useColorModeValue } from "@chakra-ui/react";
import React from "react";

/**
 * SearchSelectionCategory describes a category in the selection menu.
 */
interface SearchSelectionCategory {
    /**
     * The name of the category.
     */
    name: string;

    /**
     * A callback function to select this category.
     */
    select: () => void;

    /**
     * The number of items available in this selection.
     */
    number: number;

    /**
     * A boolean to determine whether this category should be highlighted.
     */
    active?: boolean
}

/**
 * Properties for the {@link SearchSelection}-Component.
 */
interface SearchSelectionProps {
    categories: SearchSelectionCategory[];
}

/**
 * SearchSelection is a component to let the user select the current category a search is performed in.
 * @param categories The categories for the user to select.
 */
export const SearchSelection = ({
    categories
}: SearchSelectionProps) => {
    const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    return (
        <Box
            w={"33%"}
            mt={10}
            borderColor={borderColor}
            borderRadius={5}
            borderWidth={1}>
            <Heading>Categories</Heading>
            {categories.map((category: SearchSelectionCategory) => (
                <SearchSelectionItem
                    category={category}
                    key={category.name + "_category"}
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
}

/**
 * SearchSelectionItem is a React Fragment for an item in the {@link SearchSelection}.
 * @param category The category to display in the item.
 */
const SearchSelectionItem = ({ category }: SearchSelectionItemProps) => {
    return (
        <Grid templateColumns={"repeat(2, 1fr)"} gap={1} w={"100%"} onClick={category.select} bg={category.active ? "red" : undefined}>
            <GridItem>{category.name}</GridItem>
            <GridItem justifySelf={"end"}>{category.number}</GridItem>
        </Grid>
    );
};
