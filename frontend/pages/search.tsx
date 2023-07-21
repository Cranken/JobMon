import React, { useEffect, useState } from "react";
import { Center, Grid, GridItem, Heading, Stack, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import SearchSelection, { SearchResultsCategories } from "@/components/search/SearchSelection";
import SearchBar from "@/components/search/SearchBar";
import SearchResultList, { SearchResult } from "@/components/search/SearchResultList";
import { JobMetadata } from "@/types/job";


/**
 * Search helps the user search for different a term in the list of jobs and in the users
 */
const Search = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const searchButtonBackgroundColor = useColorModeValue("gray.500", "gray.400");
    const searchBorderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [resultsUsers, setResultsUsers] = useState<SearchResult[]>([]);
    const [resultsJobs, setResultsJobs] = useState<SearchResult[]>([]);
    const [activeCategory, setActiveCategory] = useState(SearchResultsCategories.All);

    // Read term from router
    useEffect(() => {
        const { term } = router.query;
        if (term?.length ?? 0 > 0) {
            setSearchTerm(term as string);
        }
    }, [router]);

    // Search for users
    useEffect(() => {
        if (searchTerm != "") {
            setIsLoadingUsers(true)
            fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/search/user/${searchTerm}`, {
                credentials: "include",
            }).then((res) =>
                res.json().then((val: string[]) => {
                    if (val == null) {
                        setResultsUsers([]);
                        setIsLoadingUsers(false);
                    }
                    else {
                        const results = val.map((value: string) => {
                            return {
                                category: "User",
                                name: value,
                                link: `/jobs?user=${value}`,
                            }
                        });
                        setResultsUsers(results);
                        setIsLoadingUsers(false);

                    }
                })
            );
        }
        else {
            setResultsUsers([]);
            setIsLoadingUsers(false);
        }

    }, [searchTerm])

    // Search for jobs
    useEffect(() => {
        if (searchTerm != "") {
            setIsLoadingJobs(true)
            fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/search/job/${searchTerm}`, {
                credentials: "include",
            }).then((res) =>
                res.json().then((val: JobMetadata[]) => {
                    if (val == null) {
                        setResultsJobs([]);
                        setIsLoadingJobs(false);
                    }
                    else {
                        const results = val.sort((a: JobMetadata, b: JobMetadata) => b.StartTime - a.StartTime).map((value: JobMetadata) => {
                            return {
                                category: "Job",
                                name: value.Id.toString(),
                                link: `/job/${value.Id}`,
                                text: value.JobName + " | " + value.Account + " | " + value.Partition + " | Start: " + new Date(value.StartTime * 1000).toLocaleString() + " | End: " + new Date(value.StopTime * 1000).toLocaleString()
                            }
                        });
                        setResultsJobs(results);
                        setIsLoadingJobs(false);
                    }
                })
            );
        }
        else {
            setResultsUsers([]);
            setIsLoadingJobs(false);
        }
        
    }, [searchTerm])

    const getCurrentResultsByCategory = () => {
        switch (activeCategory) {
            case SearchResultsCategories.All:
                return resultsUsers.concat(resultsJobs);
            case SearchResultsCategories.Users:
                return resultsUsers;
            case SearchResultsCategories.Jobs:
                return resultsJobs;
        }
    }


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
                        search={setSearchTerm}
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
                                    category: SearchResultsCategories.All,
                                    select: (() => setActiveCategory(SearchResultsCategories.All)),
                                    number: resultsUsers.length + resultsJobs.length,
                                    isLoading: isLoadingUsers || isLoadingJobs
                                },
                                {
                                    category: SearchResultsCategories.Users,
                                    select: (() => setActiveCategory(SearchResultsCategories.Users)),
                                    number: resultsUsers.length,
                                    isLoading: isLoadingUsers,
                                },
                                {
                                    category: SearchResultsCategories.Jobs,
                                    select: (() => setActiveCategory(SearchResultsCategories.Jobs)),
                                    number: resultsJobs.length,
                                    isLoading: isLoadingJobs,
                                },
                            ]}
                            activeCategory={activeCategory} />
                        </GridItem>
                        <GridItem colSpan={5}>
                            <SearchResultList results={getCurrentResultsByCategory()} />
                        </GridItem>
                    </Grid>
                </Center>
            </Stack>
        </Center>
    );
}
export default Search;
