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
  Spinner,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import APIView from "../components/settings/APIView";
import GeneralView from "../components/settings/GeneralView";
import LogView from "../components/settings/LogView";
import MetricsView from "../components/settings/MetricsView";
import PartitionsView from "../components/settings/PartitionsView";
import UsersView from "../components/settings/UsersView";
import { Configuration } from "../types/config";
import { authFetch } from "../utils/auth";

enum SettingsView {
  General = "General Settings",
  API = "API",
  Metrics = "Metrics",
  Partitions = "Partitions",
  Logs = "Logs",
  Users = "Users"
}

export const Settings = () => {
  const [settingsView, setSettingsView] = useState(SettingsView.General);
  const [config, setConfig] = useGetConfig();
  if (!config) {
    return (
      <Center>
        <Spinner />
      </Center>
    );
  }
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
        <GridItem colSpan={3}>
          {renderSettingsView(settingsView, config, setConfig)}
        </GridItem>
      </Grid>
    </Center>
  );
};

const renderSettingsView = (
  view: SettingsView,
  config: Configuration,
  setConfig: (c: Configuration) => void
) => {
  switch (view) {
    case SettingsView.General:
      return <GeneralView />;
    case SettingsView.API:
      return <APIView />;
    case SettingsView.Metrics:
      return <MetricsView config={config} setConfig={setConfig} />;
    case SettingsView.Partitions:
      return <PartitionsView config={config} setConfig={setConfig} />;
    case SettingsView.Logs:
      return <LogView />;
    case SettingsView.Users:
      return <UsersView />;
  }
  return null;
};

const useGetConfig: () => [
  Configuration | undefined,
  (c: Configuration) => void
] = () => {
  const [config, setConfig] = useState<Configuration>();
  const toast = useToast();
  const setAndSubmit = (c: Configuration) => {
    setConfig(c);

    const url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/config/update`
    );

    authFetch(url.toString(), { method: "PATCH", body: JSON.stringify(c) }).then((data: Configuration) => {
      setConfig(data);
      toast({
        description: "Config updated successfully",
        status: "success",
        isClosable: true
      });
    }, (reason) =>
      toast({
        description: `Config update failed: ${reason}`,
        status: "error",
        isClosable: true
      })
    );

  };

  useEffect(() => {
    const url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/config`
    );

    fetch(url.toString(), { credentials: "include" }).then((res) => {
      res.json().then((data: Configuration) => {
        setConfig(data);
      });
    });
  }, []);
  return [config, setAndSubmit];
};

export default Settings;
