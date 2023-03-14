import {
  useDisclosure,
  Stack,
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  ModalFooter,
  Text,
  Textarea,
} from "@chakra-ui/react";
import React, { useState } from "react";

/**
 * APIView is a React Component allowing the user to generate an API key.
 */
const APIView = () => {
  const [apiKey, setApiKey] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const generateApiKey = () => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/generateAPIKey", {
      method: "POST",
      credentials: "include",
    }).then((resp) =>
      resp.body
        ?.getReader()
        .read()
        .then((val) => {
          if (val.value) {
            setApiKey(new TextDecoder().decode(val.value));
            onClose();
          }
        })
    );
  };
  return (
    <Stack gap={2}>
      <Box>
        <Button onClick={onOpen}>Generate API Key</Button>
      </Box>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent w="500px">
          <ModalBody>
            <Stack gap={2}>
              <Alert status="error">
                <AlertIcon />
                <AlertTitle>Warning!</AlertTitle>
                <AlertDescription>
                  <Text>Are you sure?</Text>
                  <Text>This will invalidate any existing API keys</Text>
                </AlertDescription>
              </Alert>
              <Box>
                <Button onClick={() => generateApiKey()}>Generate</Button>
              </Box>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Textarea value={apiKey} placeholder="API key" isReadOnly>
        test
      </Textarea>
    </Stack>
  );
};

export default APIView;
