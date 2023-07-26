import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, Center, Grid, GridItem, Heading, Stack, Tag, Text, Wrap, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import SearchSelection, { SearchResultsCategories } from "@/components/search/SearchSelection";
import SearchBar from "@/components/search/SearchBar";
import SearchResultList, { SearchResult } from "@/components/search/SearchResultList";
import { JobMetadata, JobTag } from "@/types/job";
import { useGetUser, UserRole } from "@/utils/user";


/**
 * Search helps the user search for different a term in the list of jobs and in the users
 */
const Search = () => {
    const user = useGetUser();
    const isAdmin = (user.Roles?.includes(UserRole.Admin) ?? false);
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const searchButtonBackgroundColor = useColorModeValue("gray.500", "gray.400");
    const searchBorderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [isLoadingTags, setIsLoadingTags] = useState(true);
    const [resultsUsers, setResultsUsers] = useState<SearchResult[]>([]);
    const [resultsJobs, setResultsJobs] = useState<SearchResult[]>([]);
    const [resultsTags, setResultsTags] = useState<SearchResult[]>([]);
    const [activeCategory, setActiveCategory] = useState(SearchResultsCategories.All);
    const MINIMAL_SEARCH_STRING_LENGTH = 2;

    // Read term from router
    useEffect(() => {
        const { term } = router.query;
        if (term?.length ?? 0 > 0) {
            setSearchTerm(term as string);
        }
    }, [router]);

    // Search for users
    useEffect(() => {
        if (searchTerm.length >= MINIMAL_SEARCH_STRING_LENGTH && isAdmin) {
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
        if (searchTerm.length >= MINIMAL_SEARCH_STRING_LENGTH) {
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
                                name: "Job ID: " + value.Id.toString(),
                                link: `/job/${value.Id}`,
                                //text: value.JobName + " | " + value.Account + " | " + value.Partition + " | Start: " + new Date(value.StartTime * 1000).toLocaleString() + " | End: " + new Date(value.StopTime * 1000).toLocaleString(),
                                body: (
                                    <Stack textAlign="start" pt={2} pl={2}>
                                        <Text>
                                            User: {value.UserName} ({value.GroupName})
                                        </Text>
                                        <Text>Name: {value.JobName}</Text>
                                        <Text>
                                            Start: {new Date(value.StartTime * 1000).toLocaleString()}
                                        </Text>
                                        {value.IsRunning ? (
                                            <Box>
                                                <Tag colorScheme="green">Running</Tag>
                                            </Box>
                                        ) : (
                                            <Text>
                                                End: {new Date(value.StopTime * 1000).toLocaleString()}
                                            </Text>
                                        )}
                                        {value.Tags && value.Tags.length > 0 ? (
                                            <Wrap>
                                                {value.Tags.map((tag) => (
                                                    <Tag key={tag.Name}>{tag.Name}</Tag>
                                                ))}
                                            </Wrap>
                                        ) : null}
                                    </Stack>
                                ),
                            }
                        });
                        setResultsJobs(results);
                        setIsLoadingJobs(false);
                    }
                })
            );
        }
        else {
            setResultsJobs([]);
            setIsLoadingJobs(false);
        }

    }, [searchTerm])

    // Search for tags
    useEffect(() => {
        if (searchTerm.length >= MINIMAL_SEARCH_STRING_LENGTH) {
            setIsLoadingTags(true)
            fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/search/tag/${searchTerm}`, {
                credentials: "include",
            }).then((res) =>
                res.json().then((val: JobTag[]) => {
                    if (val == null) {
                        setResultsTags([]);
                        setIsLoadingTags(false);
                    }
                    else {
                        const results = val.sort().map((value: JobTag) => {
                            return {
                                category: "Tag",
                                name: value.Name,
                                link: `/jobs?tag=${value.Name}`,
                                text: "Created by: " + value.CreatedBy
                            }
                        });
                        setResultsTags(results);
                        setIsLoadingTags(false);
                    }
                })
            );
        }
        else {
            setResultsTags([]);
            setIsLoadingTags(false);
        }

    }, [searchTerm])

    /**
     * Selects to list of results, that should currently be displayed
     * @returns The list of results
     */
    const getCurrentResultsByCategory = () => {
        switch (activeCategory) {
            case SearchResultsCategories.All:
                return resultsUsers.concat(resultsJobs).concat(resultsTags);
            case SearchResultsCategories.Users:
                return resultsUsers;
            case SearchResultsCategories.Jobs:
                return resultsJobs;
            case SearchResultsCategories.Tags:
                return resultsTags;
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
                        search={(term: string) => {
                            window.location.href = `/search?term=${term}`
                        }}
                        searchBorderColor={searchBorderColor}
                        searchButtonBackgroundColor={searchButtonBackgroundColor}
                        initialValue={searchTerm}
                    />
                </Center>
                <Center pt={15}>
                    <Grid
                        templateColumns={{
                            base: "1fr",
                            md: "repeat(4, 1fr)",
                            lg: "repeat(5, 1fr)",
                            xl: "repeat(6, 1fr)"
                        }}
                        w={"100%"}
                        gap={2}>
                        <GridItem colSpan={1}>
                            <SearchSelection categories={isAdmin ? [
                                {
                                    category: SearchResultsCategories.All,
                                    select: (() => setActiveCategory(SearchResultsCategories.All)),
                                    number: resultsUsers.length + resultsJobs.length + resultsTags.length,
                                    isLoading: isLoadingUsers || isLoadingJobs || isLoadingTags
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
                                {
                                    category: SearchResultsCategories.Tags,
                                    select: (() => setActiveCategory(SearchResultsCategories.Tags)),
                                    number: resultsTags.length,
                                    isLoading: isLoadingTags,
                                },
                            ] : [
                                {
                                    category: SearchResultsCategories.All,
                                    select: (() => setActiveCategory(SearchResultsCategories.All)),
                                    number: resultsUsers.length + resultsJobs.length + resultsTags.length,
                                    isLoading: isLoadingUsers || isLoadingJobs || isLoadingTags
                                },
                                {
                                    category: SearchResultsCategories.Jobs,
                                    select: (() => setActiveCategory(SearchResultsCategories.Jobs)),
                                    number: resultsJobs.length,
                                    isLoading: isLoadingJobs,
                                },
                                {
                                    category: SearchResultsCategories.Tags,
                                    select: (() => setActiveCategory(SearchResultsCategories.Tags)),
                                    number: resultsTags.length,
                                    isLoading: isLoadingTags,
                                },
                            ]}
                                activeCategory={activeCategory} />
                        </GridItem>
                        <GridItem
                            colSpan={{
                                base: 1,
                                md: 3,
                                lg: 4,
                                xl: 5
                            }}>
                            {searchTerm.length >= MINIMAL_SEARCH_STRING_LENGTH ? (
                                <SearchResultList results={getCurrentResultsByCategory()} />
                            ) : (
                                <Alert
                                    status='warning'
                                    variant='subtle'
                                    flexDirection='column'
                                    alignItems='center'
                                    justifyContent='center'
                                    textAlign='center'
                                    height='200px'
                                >
                                    <AlertIcon boxSize='40px' mr={0} />
                                    <AlertTitle mt={4} mb={1} fontSize='lg'>
                                        Unable to search
                                    </AlertTitle>
                                    <AlertDescription maxWidth='sm'>
                                        Please enter at least to characters to search.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </GridItem>
                    </Grid>
                </Center>
            </Stack>
        </Center>
    );
}
export default Search;
