import React, { useEffect, useState } from "react";
import { Center, Stack, Text, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import SearchSelection from "@/components/search/SearchSelection";
import SearchBar from "@/components/search/SearchBar";

/**
 * Search helps the user search for different a term in the list of jobs and in the users
 */
const Search = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const searchButtonBackgroundColor = useColorModeValue("gray.500", "gray.400");
    const searchBorderColor = useColorModeValue("gray.300", "whiteAlpha.400");


    // Read term from router
    useEffect(() => {
        const { term } = router.query;
        if (term?.length ?? 0 > 0) {
            setSearchTerm(term as string);
        }
    }, [router]);

    return (
        <Stack w={"100%"} mt={10}>
            <Center>
                <SearchBar
                    search={(s: string) => console.log(s)}
                    searchBorderColor={searchBorderColor}
                    searchButtonBackgroundColor={searchButtonBackgroundColor}
                    initialValue={ searchTerm }
                    />
            </Center>
            <Center>   
            <SearchSelection categories={[
                {
                    name: "test",
                    select: (() => console.log("test")),
                    number: 2,
                    active: true
                },
                {
                    name: "test2",
                    select: (() => console.log("test")),
                    number: 213541,
                }
            ]} />
            <Text>{searchTerm}</Text>
            </Center>
        </Stack>
    );
}
export default Search;