import React from "react";
import {Stack, Center, Text, Heading, useColorModeValue} from "@chakra-ui/react";

const RoleError = () => {
    const borderColor = useColorModeValue("gray.500", "whiteAlpha.500");
    return <Center>
        <Stack borderWidth="1px" borderRadius="lg" p={5} margin={4} borderColor={borderColor}>
            <Center>
                <Heading>
                    Access Denied
                </Heading>
            </Center>
            <Text>
                You need a appropriate role to access the frontend
            </Text>
        </Stack>
    </Center>;
}
export default RoleError;