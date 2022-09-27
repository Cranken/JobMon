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
  Stack,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { SelectionMap } from "../../types/helpers";

type Items = { [key: string]: boolean };
type SetFn = (val: SelectionMap) => void;

export interface SelectionProps {
  setChecked: SetFn;
  items: Items;
  nodePrefix: string;
  selectionAllowed: boolean;
}

export const Selection = ({
  setChecked,
  items,
  nodePrefix,
  selectionAllowed,
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
          onChange={selectionAllowed ? setChecked : () => {}}
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
            {selectionAllowed ? (
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
            ) : (
              <Alert status="info">
                <AlertIcon />
                Selection not available when viewing live jobs
              </Alert>
            )}
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
  const parts = str.split(" ");
  if (parts.length > 0) {
    const selected = parts.flatMap(parsePart);
    let map: SelectionMap = {};
    map["all"] = false;
    for (const node of selected) {
      const padding = Math.max(4 - node.length, 0);
      const nodeName = nodePrefix + "0".repeat(padding) + node;
      map[nodeName] = true;
    }
    setChecked(map);
  }
};

const parsePart = (s: string) => {
  let matches = s.match(/((?:\[)(?<range>\d+-\d+)(?:\]))|(?<single>\d+)/);
  let nodes: string[] = [];
  if (matches !== null && matches.groups) {
    if (matches.groups["single"]) {
      nodes.push(matches.groups["single"]);
    } else if (matches.groups["range"]) {
      const parts = matches.groups["range"].split("-");
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
