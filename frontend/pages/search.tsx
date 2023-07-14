import React, { useEffect, useState } from "react";
import { Center, Grid, GridItem, Stack, Text, useColorModeValue } from "@chakra-ui/react";
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
                    initialValue={searchTerm}
                />
            </Center>
            <Center>
                <Grid templateColumns={"repeat(6, 1fr)"} w={"100%"} p={2} gap={2}>
                    <GridItem colSpan={1}>
                        <SearchSelection categories={[
                            {
                                name: "All",
                                select: (() => console.log("All")),
                                number: 5023,
                                active: true
                            },
                            {
                                name: "Users",
                                select: (() => console.log("users")),
                                number: 12,
                            },
                            {
                                name: "Jobs",
                                select: (() => console.log("Jobs")),
                                number: 6,
                            },
                            {
                                name: "Tags",
                                select: (() => console.log("tags")),
                                number: 3,
                            }
                        ]} />
                    </GridItem>
                    <GridItem colSpan={5}>
                        <Text>{searchTerm}</Text>
                    </GridItem>
                </Grid>
            </Center>
        </Stack>
    );
}
export default Search;
