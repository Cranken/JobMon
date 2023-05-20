import { Stack, useToast, Input, FormLabel, Button, Box, Wrap, useColorModeValue, Code } from "@chakra-ui/react";
import { Field, Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import { AvailableUserRoles, UserRoles } from "@/types/config";
import { authFetch } from "@/utils/auth";

const UsersView = () => {
    const [username, setUsername] = useState<string>();
    const [user, updateUser] = useGetUser(username);
    
    // Wide and small device version
    return (
        <Stack>
            <Formik initialValues={{ username: "" }} onSubmit={(values) => setUsername(values.username)}>
                <Form>
                    <Stack direction={{base: "column", lg: "row"}}>
                        <Box>
                            <FormLabel pt={1}>Enter Username (Requires user to have logged in before)</FormLabel>
                            <Field id="username" name="username" placeholder="" as={Input} />
                        </Box>
                        <Button type="submit" colorScheme="green" alignSelf={{base: "center", lg: "end"}} w={{base: "97%", lg: ""}}>
                            Load
                        </Button>
                    </Stack>
                </Form>
            </Formik>
            <UserConfigItem user={user} updateUser={updateUser}/>
        </Stack>
    );
};

interface IUserConfigItemProps {
    user?: UserRoles;
    updateUser: (user: UserRoles) => void;
}

const UserConfigItem = ({ user, updateUser}: IUserConfigItemProps) => {
    if (!user) {
        return null;
    }

    const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
    return (
        <Box
            border="1px"
            borderColor={borderColor}
            borderRadius={5}
            p={2}>
            <Formik
                enableReinitialize={true}
                initialValues={{ Roles: user.Roles }}
                onSubmit={(values) => updateUser({ ...user, Roles: values.Roles })}>
                <Form>
                    <Stack direction={{base: "column", lg: "row"}}>
                        <Box>
                            <FormLabel pt={1}>
                                Select User Roles for
                                <Code ml={1}>
                                    {user.Username}
                                </Code>
                            </FormLabel>
                            <Wrap gap={5}>
                                {Object.values(AvailableUserRoles).map((val) =>
                                    <FormLabel key={val}>
                                        <Field type="checkbox" name="Roles" value={val} />
                                        {val}
                                    </FormLabel>
                                )}
                            </Wrap>
                        </Box>
                        <Button type="submit" colorScheme="green" alignSelf={{base: "center", lg: "end"}} w={{base: "90%", lg: ""}}>
                            Save
                        </Button>
                    </Stack>
                </Form>
            </Formik>
        </Box>
    );
};

/**
 * useGetUser is a function to get information to a given user from the backend.
 * 
 * @param username The username to identify the user
 * @returns
 * - The user with information about it's roles
 * - A callback function to modify the user's properties
 */
const useGetUser: (username?: string) => [UserRoles | undefined, (user: UserRoles) => void] = (username?: string) => {
    const [user, setUser] = useState<UserRoles>();
    const toast = useToast();
    const url = new URL(
        process.env.NEXT_PUBLIC_BACKEND_URL +
        `/api/config/users/${username}`
    );

    const updateUser = (user: UserRoles) => {
        authFetch(url.toString(), { method: "PATCH", body: JSON.stringify(user) }).then(
            (data) => {
                setUser(data)
                toast({
                    description: "User " + user.Username + " updated",
                    status: "success",
                    duration: 30000,
                    isClosable: true
                })
            },
            (reason) =>
                toast({
                    description: `Could not update user config: ${reason}`,
                    status: "error",
                    isClosable: true
                })
        );
    };

    useEffect(() => {
        if (username) {
            authFetch(url.toString()).then(
                (data) => setUser(data),
                (reason) => {
                    setUser(undefined);
                    toast({
                        description: `Could not get users config: ${reason}`,
                        status: "error",
                        isClosable: true
                    });
                }
            );
        }
    }, [username]);
    return [user, updateUser];
};

export default UsersView;