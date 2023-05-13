import {
  Button,
  Center,
  Divider,
  Grid,
  GridItem,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Stack,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import APIView from "@/components/settings/APIView";
import GeneralView from "@/components/settings/GeneralView";
import LogView from "@/components/settings/LogView";
import MetricsView from "@/components/settings/MetricsView";
import PartitionsView from "@/components/settings/PartitionsView";
import UsersView from "@/components/settings/UsersView";
import { Configuration } from "@/types/config";
import { authFetch } from "@/utils/auth";
import { useGetUser, UserRole } from "@/utils/user";
import AccessDenied from "./accessDenied";
import { useIsWideDevice } from "@/utils/utils";
import { ChevronDownIcon } from "@chakra-ui/icons";

enum SettingsView {
  General = "General Settings",
  API = "API",
  Metrics = "Metrics",
  Partitions = "Partitions",
  Logs = "Logs",
  Users = "Users"
}

export const Settings = () => {
  if (!(useGetUser().Roles?.includes(UserRole.Admin) ?? false)) {
    return <AccessDenied />;
  }
  const [settingsView, setSettingsView] = useState(SettingsView.General);
  const [config, setConfig] = useGetConfig();
  const isWide = useIsWideDevice();

  if (!config) {
    return (
      <Center>
        <Spinner />
      </Center>
    );
  }

  // Small device version
  if (!isWide) {
    return (
      <Center h="100%" mt={4} flexDirection={"column"}>
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            {settingsView}
          </MenuButton>
          <MenuList>
            {Object.values(SettingsView).map((v) => (
              <MenuItem
                onClick={() => setSettingsView(v)}
                key={v}>
                  {v}
                </MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Divider mt={2} mb={2}/>
        <Center w={"97%"}>
          {renderSettingsView(settingsView, config, setConfig, isWide)}
        </Center>
      </Center>
    );
  }

  // Wide device version
  return (
    <Center h="100%" mt={4}>
      <Grid w={["95%", "80%", "65%", "50%"]} templateColumns="repeat(4, 1fr)" h="100%" gap={2}>
        <GridItem colSpan={1} borderRight="1px" pr={1}>
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
          {renderSettingsView(settingsView, config, setConfig, isWide)}
        </GridItem>
      </Grid>
    </Center>
  );
};

/**
 * Selects the setting to show based on the users selection.
 * @param view Specifies the setting to show.
 * @param config The currently set configuration.
 * @param setConfig A function to set a new configuration.
 * @param isWide Defines if the used device is wide
 * @returns The setting as react component.
 */
const renderSettingsView = (
  view: SettingsView,
  config: Configuration,
  setConfig: (c: Configuration) => void,
  isWide: boolean
) => {
  switch (view) {
    case SettingsView.General:
      return <GeneralView isWideDevice={isWide}/>;
    case SettingsView.API:
      return <APIView isWideDevice={isWide}/>;
    case SettingsView.Metrics:
      return <MetricsView config={config} setConfig={setConfig} isWideDevice={isWide}/>;
    case SettingsView.Partitions:
      return <PartitionsView config={config} setConfig={setConfig} isWideDevice={isWide}/>;
    case SettingsView.Logs:
      return <LogView />;
    case SettingsView.Users:
      return <UsersView isWideDevice={isWide}/>;
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
      process.env.NEXT_PUBLIC_BACKEND_URL + "/api/config/update"
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
      process.env.NEXT_PUBLIC_BACKEND_URL + "/api/config"
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
