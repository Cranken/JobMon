import React from "react";
import {Stack, Center, Text, Heading, useColorModeValue, Button, useToast} from "@chakra-ui/react";
import {useGetUser} from "@/utils/user";

const RoleError = () => {
    const user = useGetUser();
    const toast = useToast();
    const requestAccess = () => {
        fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/notify/admin", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({
                username: user.Username,
                roles: user.Roles
            }),
        }).then((resp: Response) => {
            if (resp.ok) {
                console.log("Request success");
                toast({
                    description: "The request was send successfully",
                    status: "success",
                    isClosable: true
                });
            } else {
                console.log("Request success");
                toast({
                    description: "Failed to send request",
                    status: "error",
                    isClosable: true
                })
            }
        });
    }

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
                        You can request access with the button below.
                    </Text>
                </Center>
                <Center>
                    <Button type="submit" colorScheme="green" alignSelf="end" onClick={() => requestAccess()}>
                        Request Access
                    </Button>
                </Center>
            </Stack>
        </Center>
    </React.Fragment>;
}
export default RoleError;
