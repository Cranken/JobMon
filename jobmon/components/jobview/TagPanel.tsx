import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import {
  Button,
  Flex,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Tag,
  useColorModeValue,
  useDisclosure,
  Wrap,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { addJobTag } from "../../utils/utils";
import { JobMetadata, JobTag } from "./../../types/job";
import { removeJobTag } from "./../../utils/utils";

interface TagPanelProps {
  job: JobMetadata;
}

export const TagPanel = ({ job }: TagPanelProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [addTagText, setAddTagText] = useState("");
  const [tags, setTags] = useState<JobTag[]>([]);
  const borderColor = useColorModeValue("gray.300", "whiteAlpha.400");
  useEffect(() => {
    setTags(job.Tags);
  }, [job.Tags]);
  const addTag = (name: string) => {
    const tag: JobTag = { Name: name };
    addJobTag(job.Id, tag).then((resp) => {
      if (resp.status === 200) {
        setTags([...tags, tag]);
      }
    });
  };
  const removeTag = (name: string) => {
    const tag: JobTag = { Name: name };
    removeJobTag(job.Id, tag).then((resp) => {
      if (resp.status === 200) {
        const filteredTags = tags.filter((t) => t.Name !== tag.Name);
        setTags(filteredTags);
      }
    });
  };
  const elements: JSX.Element[] = [];
  elements.push(
    <>
      <Button size={"sm"} onClick={onOpen}>
        Set Tags
      </Button>

      <Modal size="xs" isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Tags</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack>
              {tags?.map((tag) => (
                <Flex
                  border="1px"
                  borderColor={borderColor}
                  borderRadius="md"
                  key={tag.Name}
                  justify="space-between"
                  align="center"
                  p={1}
                >
                  <Tag>{tag.Name}</Tag>
                  <IconButton
                    aria-label={"remove-tag"}
                    icon={<MinusIcon />}
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTag(tag.Name)}
                  ></IconButton>
                </Flex>
              ))}
              <Flex align="center">
                <Input
                  variant="outline"
                  placeholder="Add Tag..."
                  size="sm"
                  w="fit-content"
                  borderRadius="lg"
                  value={addTagText}
                  onChange={(ev) => setAddTagText(ev.target.value)}
                  onKeyPress={(ev) => {
                    if (
                      ev.key === "Enter" &&
                      !ev.altKey &&
                      !ev.ctrlKey &&
                      !ev.shiftKey &&
                      !ev.metaKey
                    ) {
                      addTag(addTagText);
                      setAddTagText("");
                    }
                  }}
                />
                <IconButton
                  aria-label={"add-tag"}
                  icon={<AddIcon />}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    addTag(addTagText);
                    setAddTagText("");
                  }}
                ></IconButton>
              </Flex>
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

  if (tags?.length > 0) {
    elements.push(
      <>
        {tags.map((tag) => (
          <Tag key={tag.Name}>{tag.Name}</Tag>
        ))}
      </>
    );
  }
  return <Wrap>{elements}</Wrap>;
};
