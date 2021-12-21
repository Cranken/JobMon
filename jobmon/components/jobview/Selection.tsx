import {
  Accordion,
  AccordionItem,
  AccordionButton,
  Box,
  AccordionIcon,
  AccordionPanel,
  Container,
  Flex,
  Button,
  Text,
} from "@chakra-ui/react";
import styles from "./Selection.module.css";

export interface SelectionProps {
  setChecked: (key: string, val: boolean) => void;
  items: { [key: string]: boolean };
}

export const Selection = ({ setChecked, items }: SelectionProps) => {
  let elements: JSX.Element[] = [];

  let allChecked = true;
  elements.push(
    ...Object.keys(items).map((key) => {
      allChecked = allChecked && items[key];
      return (
        <SelectionItem
          key={key}
          value={key}
          onChange={setChecked}
          checked={items[key]}
        />
      );
    })
  );
  // elements.unshift(
  //   <SelectionItem
  //     key="all"
  //     label="Select All"
  //     value="all"
  //     onChange={setChecked}
  //     checked={allChecked}
  //   />
  // );

  return (
    <Accordion allowToggle w={"100%"}>
      <AccordionItem>
        <h2>
          <AccordionButton>
            <Flex flex="1" textAlign="left" justify="space-between">
              <Text>Nodes ({Object.keys(items).length})</Text>
            </Flex>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <Flex wrap="wrap" direction="row">
            <Button
              w="12ch"
              size="xs"
              mr={2}
              onClick={() => setChecked("all", !allChecked)}
            >
              Select {allChecked ? "None" : "All"}
            </Button>
            {elements}
          </Flex>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

interface SelectionItemProps {
  label?: string;
  value: string;
  onChange: (key: string, val: boolean) => void;
  checked: boolean;
}

const SelectionItem = ({
  label,
  value,
  onChange,
  checked,
}: SelectionItemProps) => {
  const id = value + "_checkbox";
  return (
    <Text
      mr={1}
      as={checked ? undefined : "s"}
      onClick={() => onChange(value, !checked)}
      cursor="pointer"
      fontWeight="bold"
    >
      {value}
    </Text>
  );
};

export default Selection;
