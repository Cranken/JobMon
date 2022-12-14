import { Box, Button, Container, Flex, Heading, Input, Stack, StackDivider } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { JobMetadata } from "../../types/job";

const GeneralView = () => {
    const [id, setId] = useState("");
    return <>
        <Stack
            divider={<StackDivider />}
        >
            <Stack>
                <Heading size="md">Refresh Metadata</Heading>
                <Stack gap={2} direction="row">
                    <Input maxW="15ch" placeholder="Job Id" value={id} onChange={(ev) => {
                        const val = ev.target.value;
                        if (!isNaN(+val)) {
                            setId(val)
                        }
                    }} />
                    <Box>
                        <Button onClick={() => refreshJobMetadata(id)}>Refresh</Button>
                    </Box>
                </Stack>
            </Stack>
        </Stack>
    </>;
};

const refreshJobMetadata = (id: string) => {
    const url = new URL(
        "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/refresh_metadata/${id.toString()}`
    );
    fetch(url.toString(), {
        credentials: "include",
        method: "POST"
    }).then((resp) => resp.json().then((data: JobMetadata) => {
        console.log(data);
    }))
}

export default GeneralView;