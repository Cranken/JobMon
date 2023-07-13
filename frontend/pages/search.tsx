import React, { useEffect, useState } from "react";
import { Box, Center, Heading, Text, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import SearchSelection from "@/components/search/SearchSelection";
import { active } from "d3";

/**
 * Search helps the user search for different a term in the list of jobs and in the users
 */
const Search = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");


    // Read term from router
    useEffect(() => {
        const { term } = router.query;
        if (term?.length ?? 0 > 0) {
            setSearchTerm(term as string);
        }
    }, [router]);

    return <Center>
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
    </Center>;
}
export default Search;