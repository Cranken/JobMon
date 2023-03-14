import { Stack, useToast, Input, FormLabel, Button, Box, Wrap } from "@chakra-ui/react";
import { Field, Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import {UserRoles} from "../../types/config";
import {authFetch, UserRole} from "../../utils/auth";

const UsersView = () => {
    const [username, setUsername] = useState<string>();
    const [user, updateUser] = useGetUser(username);
    return (
        <Stack>
            <Formik initialValues={{ username: "" }} onSubmit={(values) => setUsername(values.username)}>
                <Form>
                    <Stack direction="row">
                        <Box>
                            <FormLabel pt={1}>Enter Username (Requires user to have logged in before)</FormLabel>
                            <Field id="username" name="username" placeholder="" as={Input} />
                        </Box>
                        <Button type="submit" colorScheme="green" alignSelf="end">
                            Load
                        </Button>
                    </Stack>
                </Form>
            </Formik>
            <UserConfigItem user={user} updateUser={updateUser} />
        </Stack>
    );
};

interface IUserConfigItemProps {
    user?: UserRoles;
    updateUser: (user: UserRoles) => void;
}

const UserConfigItem = ({ user, updateUser }: IUserConfigItemProps) => {
    if (!user) {
        return null;
    }
    return (
        <Formik enableReinitialize={true} initialValues={{ Roles: user.Roles }} onSubmit={(values) => updateUser({ ...user, Roles: values.Roles })}>
            <Form>
                <Stack direction="row">
                    <Box>
                        <FormLabel pt={1}>Select User Roles</FormLabel>
                        <Wrap gap={5}>
                            {Object.values(UserRole).map((val) =>
                                <FormLabel key={val}>
                                    <Field type="checkbox" name="Roles" value={val} />
                                    {val}
                                </FormLabel>
                            )}
                        </Wrap>
                    </Box>
                    <Button type="submit" colorScheme="green" alignSelf="end">
                        Save
                    </Button>
                </Stack>
            </Form>
        </Formik>
    );
};

const useGetUser: (username?: string) => [UserRoles | undefined, (user: UserRoles) => void] = (username?: string) => {
    const [user, setUser] = useState<UserRoles>();
    const toast = useToast();
    const url = new URL(
        process.env.NEXT_PUBLIC_BACKEND_URL +
        `/api/config/users/${username}`
    );

    const updateUser = (user: UserRoles) => {
        authFetch(url.toString(), { method: "PATCH", body: JSON.stringify(user) }).then(
            (data) => setUser(data),
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