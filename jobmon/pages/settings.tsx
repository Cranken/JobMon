import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Center,
  Container,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";

enum SettingsView {
  General = "General Settings",
  API = "API",
}

export const Settings = () => {
  const [settingsView, setSettingsView] = useState(SettingsView.General);
  return (
    <Center h="100%" mt={4}>
      <Grid w="50%" templateColumns="repeat(4, 1fr)" h="100%" gap={2}>
        <GridItem colSpan={1} borderRight="1px">
          <Stack alignItems="start">
            {Object.values(SettingsView).map((v) => (
              <Button
                size="lg"
                variant="link"
                w="100%"
                onClick={() => setSettingsView(v)}
                key={v}
              >
                {v}
              </Button>
            ))}
          </Stack>
        </GridItem>
        <GridItem colSpan={3}>{renderSettingsView(settingsView)}</GridItem>
      </Grid>
    </Center>
  );
};

const renderSettingsView = (view: SettingsView) => {
  switch (view) {
    case SettingsView.General:
      return <GeneralView />;
    case SettingsView.API:
      return <APIView />;
  }
  return null;
};

const GeneralView = () => {
  return <></>;
};

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
            <Stack g={2}>
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

export default Settings;
