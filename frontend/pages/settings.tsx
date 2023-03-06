import {
  Button,
  Center,
  Grid,
  GridItem,
  Spinner,
  Stack,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
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

/**
 * Settings is a React component allowing the user to change settings like displayed metrics and user-roles.
 */
export const Settings = () => {
  // Open general settings as default
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

/**
 * Switch to choose the correct settings menu.
 * @param view The currently selected view.
 * @param config The current configuration of metrics and partitions
 * @param setConfig A callback function to set a new configuration.
 */
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

/**
 * Fetches a currently made configurations for metrics and partitions.
 * @return useGetConfig provides a configuration element storing all configurations and a setter to change configurations
 */
const useGetConfig: () => [
  Configuration | undefined,
  (c: Configuration) => void
] = () => {
  const [config, setConfig] = useState<Configuration>();
  const toast = useToast();

  // Defining methode to set configurations.
  const setAndSubmit = (c: Configuration) => {
    // Updating configuration locally.
    setConfig(c);

    // Setting configuration remotely on the backend
    const url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + "/api/config/update"
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

  // Fetching configurations from the backend
  useEffect(() => {
    const url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + "/api/config"
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
