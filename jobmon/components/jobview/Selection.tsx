import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Flex,
  Button,
  Text,
  Input,
  Spacer,
  Stack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { SelectionMap } from "../../pages/job/[id]";

type Items = { [key: string]: boolean };
type SetFn = (val: SelectionMap) => void;

export interface SelectionProps {
  setChecked: SetFn;
  items: Items;
  nodePrefix: string;
}

export const Selection = ({
  setChecked,
  items,
  nodePrefix,
}: SelectionProps) => {
  const [selectionString, setSelectionString] = useState("");
  let elements: JSX.Element[] = [];
  useEffect(() => {
    parseSelection(selectionString, items, setChecked, nodePrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionString]);

  let allChecked = true;
  elements.push(
    ...Object.keys(items).map((key) => {
      allChecked = allChecked && items[key];
      return (
        <SelectionItem
          key={key}
          node={key}
          onChange={setChecked}
          checked={items[key]}
        />
      );
    })
  );

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
          <Stack>
            <Flex justify="space-between">
              <Button
                w="14ch"
                size="xs"
                mr={2}
                onClick={() => setChecked({ all: !allChecked })}
              >
                Select {allChecked ? "None" : "All"}
              </Button>
              <Input
                size="xs"
                onChange={(e) => setSelectionString(e.target.value)}
                value={selectionString}
              />
            </Flex>
            <Flex wrap="wrap" direction="row" mt={2}>
              {elements}
            </Flex>
          </Stack>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

interface SelectionItemProps {
  node: string;
  onChange: SetFn;
  checked: boolean;
}

const SelectionItem = ({ node, onChange, checked }: SelectionItemProps) => {
  return (
    <Text
      mr={1}
      as={checked ? undefined : "s"}
      onClick={() => onChange({ [node]: !checked })}
      cursor="pointer"
      fontWeight="bold"
    >
      {node}
    </Text>
  );
};

const parseSelection = (
  str: string,
  items: Items,
  setChecked: SetFn,
  nodePrefix: string
) => {
  const parts = str.split(",");
  if (parts.length > 0) {
    const selected = parts.flatMap(parsePart);
    let map: SelectionMap = {};
    map["all"] = false;
    for (const node of selected) {
      const padding = 4 - node.length;
      const nodeName = nodePrefix + "0".repeat(padding) + node;
      map[nodeName] = true;
    }
    setChecked(map);
  }
};

const parsePart = (s: string) => {
  let nodes: string[] = [];
  if (s.length > 0) {
    const parts = s.split("-");
    if (parts.length === 1) {
      nodes.push(parts[0]);
    } else if (parts.length === 2) {
      const lower = parseInt(parts[0]);
      const upper = parseInt(parts[1]);
      if (lower !== NaN && upper !== NaN) {
        for (let i = lower; i <= upper; i++) {
          nodes.push(i.toString());
        }
      }
    }
  }
  return nodes;
};

export default Selection;
