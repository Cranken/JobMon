import React from "react";
import {Stack, Center, Text, Heading, useColorModeValue, Box, FormLabel, Input, Button} from "@chakra-ui/react";
import {Field, Form, Formik} from "formik";

const RoleError = () => {
    const borderColor = useColorModeValue("gray.500", "whiteAlpha.500");
    const submitRequest = (username: string, contactAddress: string, description: string) => {
        console.log(username);
        console.log(contactAddress);
        console.log(description);
    }
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
        <Center>
            <Stack borderWidth="1px" borderRadius="lg" p={5} margin={4} borderColor={borderColor}>
                <Formik
                    initialValues={{ username: "", contact: "", description: ""}}
                    onSubmit={
                        (values) => submitRequest(
                            values.username,
                            values.contact,
                            values.description)}>
                    <Form>
                        <Stack direction="row">
                            <Box>
                                <FormLabel pt={1}>Username</FormLabel>
                                <Field id="username" name="username" placeholder="" as={Input} />
                            </Box>
                            <Box>
                                <FormLabel pt={1}>Username</FormLabel>
                                <Field id="contact" name="contact" placeholder="" as={Input} />
                            </Box>
                            <Box>
                                <FormLabel pt={1}>Username</FormLabel>
                                <Field id="description" name="description" placeholder="" as={Input} />
                            </Box>
                            <Button type="submit" colorScheme="green" alignSelf="end">
                                Submit Request
                            </Button>
                        </Stack>
                    </Form>
                </Formik>
            </Stack>
        </Center>
    </React.Fragment>;
}
export default RoleError;
