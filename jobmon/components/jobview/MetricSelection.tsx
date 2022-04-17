import {
  useDisclosure,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Stack,
  Checkbox,
  CheckboxGroup,
} from "@chakra-ui/react";

interface MetricSelectionProps {
  metrics: string[];
  selectedMetrics: string[];
  setSelectedMetrics: (val: string[]) => void;
}

export const MetricSelection = ({
  metrics,
  selectedMetrics,
  setSelectedMetrics,
}: MetricSelectionProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Button onClick={onOpen}>Metric Selection</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Metric Selection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack>
              <CheckboxGroup
                defaultValue={selectedMetrics}
                value={selectedMetrics}
                onChange={(val) => setSelectedMetrics(val as string[])}
              >
                <Stack direction={["column"]}>
                  {metrics.map((metric) => (
                    <Checkbox
                      key={metric}
                      value={metric}
                      isChecked={selectedMetrics.includes(metric)}
                    >
                      {metric}
                    </Checkbox>
                  ))}
                </Stack>
              </CheckboxGroup>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

const MetricListItem = (metric: string, setMetric: (m: string) => void) => {
  return <Checkbox></Checkbox>;
};
