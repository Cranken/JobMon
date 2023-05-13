import { Box, Button, Heading, Input, Stack } from "@chakra-ui/react";
import React, { useState } from "react";
import { JobMetadata } from "../../types/job";

interface IGeneralViewProps {
    isWideDevice?: boolean;
}

const GeneralView = ({isWideDevice = true}: IGeneralViewProps) => {
    const [id, setId] = useState("");
    return <>
        <Stack
            w={isWideDevice ? "" : "97%"}
            direction={"column"}>^
            <Heading size="md">Refresh Metadata</Heading>
            <Stack gap={2} direction={ isWideDevice ? "row" : "column" }>
                <Input maxW={ isWideDevice ? "15ch" : "" } w={isWideDevice ? "" : "97%"} placeholder="Job Id" value={id} onChange={(ev) => {
                    const val = ev.target.value;
                    if (!isNaN(+val)) {
                        setId(val);
                    }
                }} />
                <Box>
                    <Button onClick={() => refreshJobMetadata(id)} w={isWideDevice ? "" : "97%"}>Refresh</Button>
                </Box>
            </Stack>
        </Stack>
    </>;
};

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