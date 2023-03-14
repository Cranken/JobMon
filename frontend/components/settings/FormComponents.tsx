import { Alert, AlertIcon, AlertTitle, Box, FormLabel, Input, Tooltip } from "@chakra-ui/react";
import { Field } from "formik";
import React from "react";

/**
 * Checks if a given string is not empty
 * @param value The string to check
 */
export const validateNotEmpty = (value: string) => {
    return value.length > 0 ? "" : "Value is required";
};

/**
 * Checks if a given string is a number
 * @param value The string to check
 */
export const validateNumber = (value: string) => {
    return !isNaN(+value) ? "" : "Not a number";
};

/**
 * ErrorMessage displays an error message
 * @param text The message
 */
export const ErrorMessage = (text: string) => {
    return (
        <Alert my={2} status='error'>
            <AlertIcon />
            <AlertTitle>{text}</AlertTitle>
        </Alert>
    );
};

/**
 * A field to enter text
 * @param displayString The placeholder for the text-field
 * @param key The key of this text-field
 * @param errorStr The errormessage if one should be displayed
 * @param validate If true is set, the inputs will be validated
 * @param validationFunc A function to validate the inputs
 * @param tooltip The tooltip describing the field
 */
export const TextField = <T,>(displayString: string, key: keyof T, errorStr?: string, validate = true, validationFunc?: (s: string) => string, tooltip?: string) => {
    return (
        <>
            <FormLabel pt={1}>{displayString}</FormLabel>
            <Tooltip label={tooltip}>
                <Box>
                    <Field name={key} placeholder={displayString} as={Input} validate={validate ? (validationFunc ?? validateNotEmpty) : undefined} />
                </Box>
            </Tooltip>
            {errorStr && ErrorMessage(errorStr)}
        </>
    );
};

/**
 * A text-field allowing only numbers
 * @param displayString The placeholder for the text-field
 * @param key The key of this text-field
 * @param errorStr The errormessage if one should be displayed
 * @param tooltip The tooltip describing the field
 * @constructor
 */
export const NumberField = <T,>(displayString: string, key: keyof T, errorStr?: string, tooltip?: string) => {
    return TextField(displayString, key, errorStr, true, validateNumber, tooltip);
};