import React from "react";
import {Stack, Center, Text, Heading, useColorModeValue} from "@chakra-ui/react";

const RoleError = () => {
    const borderColor = useColorModeValue("gray.500", "whiteAlpha.500");
    return <React.Fragment>
        <Center>
            <Stack borderWidth="1px" borderRadius="lg" p={5} margin={4} borderColor={borderColor}>
                <Center>
                    <Heading>
                        This user is not permitted to access this webpage
                    </Heading>
                </Center>
                <Center>
                    <Text>
                        To get access you need to get a role assigned by the administration team.
                        You can request access with the form below
                    </Text>
                </Center>
            </Stack>
        </Center>
    </React.Fragment>;
}
export default RoleError;
