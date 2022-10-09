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
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import APIView from "../components/settings/APIView";
import LogView from "../components/settings/LogView";
import MetricsView from "../components/settings/MetricsView";
import { Configuration } from "./../types/config";

enum SettingsView {
  General = "General Settings",
  API = "API",
  Metrics = "Metrics",
  Logs = "Logs"
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
    case SettingsView.Logs:
      return <LogView />
  }
  return null;
};

const GeneralView = () => {
  return <></>;
};

const useGetConfig: () => [
  Configuration | undefined,
  (c: Configuration) => void
] = () => {
  const [config, setConfig] = useState<Configuration>();
  const setAndSubmit = (c: Configuration) => {
    setConfig(c);

    const url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/config/update`
    );

    fetch(url.toString(), { method: "PATCH", credentials: "include", body: JSON.stringify(c) }).then((res) => {
      res.json().then((data: Configuration) => {
        setConfig(data);
      });
    });

  }

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
