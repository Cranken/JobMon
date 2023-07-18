import React, { useEffect, useState } from "react";
import { Center, Grid, GridItem, Heading, Stack, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import SearchSelection from "@/components/search/SearchSelection";
import SearchBar from "@/components/search/SearchBar";
import SearchResultList from "@/components/search/SearchResultList";

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
        <Center>
            <Stack w={"80%"} mt={10}>
                <Center>
                    <Heading>
                        Search
                    </Heading>
                </Center>
                <Center>
                    <SearchBar
                        search={(s: string) => console.log(s)}
                        searchBorderColor={searchBorderColor}
                        searchButtonBackgroundColor={searchButtonBackgroundColor}
                        initialValue={searchTerm}
                    />
                </Center>
                <Center pt={15}>
                    <Grid templateColumns={"repeat(6, 1fr)"} w={"100%"} gap={2}>
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
                            <SearchResultList results={[
                                {
                                    category: "Users",
                                    name: "test1",
                                    open: (() => console.log("test1")),
                                    text: "TEXT TEXT"
                                },
                                {
                                    category: "Users",
                                    name: "test2",
                                    open: (() => console.log("test1")),
                                    text: "TEXT TEXT"
                                },
                                {
                                    category: "Users",
                                    name: "test3",
                                    open: (() => console.log("test1")),
                                    text: "TEXT TEXT"
                                },
                                {
                                    category: "Users",
                                    name: "test4",
                                    open: (() => console.log("test1")),
                                    text: "TEXT TEXT"
                                },
                            ]}/>
                        </GridItem>
                    </Grid>
                </Center>
            </Stack>
        </Center>
    );
}
export default Search;
