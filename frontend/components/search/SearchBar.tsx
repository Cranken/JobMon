import { SearchIcon } from "@chakra-ui/icons";
import { Button, Input, InputGroup, InputRightElement } from "@chakra-ui/react";
import React, { useEffect } from "react";

/**
 * Properties for the {@link SearchBar}-Component.
 */
interface SearchBarProps {
    search: (s: string) => void;
    searchBorderColor: string;
    searchButtonBackgroundColor: string;
    initialValue?: string;
    placeholderText?: string;
}

/**
 * SearchBar is an Component to enter a text to search for and trigger a search.
 * SearchBar consists of an input-field and and button to trigger a search. The search can also be triggered with the "Enter" key.
 * @param search The callback function to execute the search.
 * @param searchBorderColor The color of the border fo the search bar.
 * @param searchButtonBackgroundColor The background-color of the search-button.
 * @param initialValue The initial value of the search-bar.
 * @param placeholderText The text displayed while no text is entered in the searchfield.
 */
export const SearchBar = ({
    search,
    searchBorderColor,
    searchButtonBackgroundColor,
    initialValue = "",
    placeholderText = "Search",
}: SearchBarProps) => {
    const [searchValue, setSearchValue] = React.useState("");

    useEffect(() => {
        if (initialValue) {
            setSearchValue(initialValue)
        }
    }, [initialValue])

    return (
        <InputGroup>
            <Input
                placeholder={placeholderText}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        search(searchValue)
                    }
                }}
                onChange={(event) => setSearchValue(event.target.value)}
                borderColor={searchBorderColor}
                _placeholder={{ color: searchBorderColor }}
                value={searchValue}
            />
            <InputRightElement width='4.5rem'>
                <Button h='1.75rem' size='sm' onClick={() => { search(searchValue) }} bg={searchButtonBackgroundColor}>
                    <SearchIcon />
                </Button>
            </InputRightElement>
        </InputGroup>
    );
};

export default SearchBar