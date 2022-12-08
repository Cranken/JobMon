import { Alert, AlertIcon, AlertTitle, FormLabel, Input } from "@chakra-ui/react";
import { Field } from "formik";
import { MetricConfig } from "../../types/job";

export const validateNotEmpty = (value: string) => {
    return value.length > 0 ? "" : "Value is required";
};

export const validateNumber = (value: string) => {
    return !isNaN(+value) ? "" : "Not a number";
};

export const ErrorMessage = (text: string) => {
    return (
        <Alert my={2} status='error'>
            <AlertIcon />
            <AlertTitle>{text}</AlertTitle>
        </Alert>
    );
};

export const TextField = <T,>(displayString: string, key: keyof T, errorStr?: string, validate = true, validationFunc?: (s: string) => string) => {
    return (
        <>
            <FormLabel pt={1}>{displayString}</FormLabel>
            <Field name={key} placeholder={displayString} as={Input} validate={validate ? (validationFunc ?? validateNotEmpty) : undefined} />
            {errorStr && ErrorMessage(errorStr)}
        </>
    );
};

export const NumberField = <T,>(displayString: string, key: keyof T, errorStr?: string) => {
    return (
        <>
            <FormLabel pt={1}>{displayString}</FormLabel>
            <Field name={key} placeholder={displayString} as={Input} validate={validateNumber} />
            {errorStr && ErrorMessage(errorStr)}
        </>
    );
};
