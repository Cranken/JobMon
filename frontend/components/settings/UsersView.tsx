import { Stack, useToast, Input, FormLabel, Button, Box, Wrap } from "@chakra-ui/react";
import { Field, Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import {UserRoles} from "../../types/config";
import {authFetch, UserRole} from "../../utils/auth";

/**
 * UserView is a React Component providing options to view and change roles of users.
 * UserView provides a form allowing the administrator to search for users.
 * In case the administrator searches a valid user, its roles are displayed and can be modified.
 */
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

/**
 * IUserConfigItemProps is an interface to store a user with his roles and a function to modify roles.
 */
interface IUserConfigItemProps {
    user?: UserRoles;
    updateUser: (user: UserRoles) => void;
}

/**
 * UserConfigItem is a React Component that displays a users roles and provides options to modify them
 * @param user The user to display and modify
 * @param updateUser A function to update the user
 */
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

/**
 * Retrieves the given user from the backend.
 * @param username The username identifying the searched user
 * @return The user, its roles and a function to modify them
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