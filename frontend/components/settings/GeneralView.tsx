import { Box, Button, Heading, Input, Stack } from "@chakra-ui/react";
import React, { useState } from "react";
import { JobMetadata } from "../../types/job";

/**
 * React Component to control general settings.
 * 
 * This settings page provides the option to start refreshing the metadata of one job via the backend.
 * @returns The component
 */
const GeneralView = () => {
    const [id, setId] = useState("");
    return <>
        <Stack
            w={{base: "97%", lg: ""}}
            direction={"column"}>^
            <Heading size="md">Refresh Metadata</Heading>
            <Stack gap={2} direction={{base: "column", lg: "row"}}>
                <Input maxW={{base: "", lg: "15ch"}} w={{base: "97%", lg: ""}} placeholder="Job Id" value={id} onChange={(ev) => {
                    const val = ev.target.value;
                    if (!isNaN(+val)) {
                        setId(val);
                    }
                }} />
                <Box>
                    <Button onClick={() => refreshJobMetadata(id)} w={{base: "97%", lg: ""}}>Refresh</Button>
                </Box>
            </Stack>
        </Stack>
    </>;
};

/**
 * Function to start the metadata-refresh process for a given job
 * @param id ID to identify the job.
 */
const refreshJobMetadata = (id: string) => {
    const url = new URL(
        process.env.NEXT_PUBLIC_BACKEND_URL +
        `/api/admin/refresh_metadata/${id.toString()}`
    );
    fetch(url.toString(), {
        credentials: "include",
        method: "POST"
    }).then((resp) => resp.json().then((data: JobMetadata) => {
        console.log(data);
    }));
};

export default GeneralView;