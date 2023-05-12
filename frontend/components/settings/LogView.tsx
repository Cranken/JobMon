import { Textarea } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";

interface ILogViewProps {
    isWideDevice?: boolean;
}

const LogView = ({isWideDevice = true}: ILogViewProps) => {
    const [, setWs] = useState<WebSocket>();
    const [lastMessage, setLastMessage] = useState();
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        const url = new URL(
            process.env.NEXT_PUBLIC_BACKEND_WS +
            "/api/admin/livelog"
        );
        const ws = new WebSocket(url);
        ws.onmessage = (msg) => {
            setLastMessage(msg.data);
        };
        window.onbeforeunload = () => {
            ws.onclose = () => undefined;
            ws.close();
        };
        setWs(ws);
        return () => {
            ws.close();
            setWs(undefined);
        };
    }, []);

    useEffect(() => {
        if (lastMessage) {
            setMessages([...messages, lastMessage]);
        }
    }, [lastMessage]);

    return <Textarea value={messages.join("")} height="60vh" readOnly></Textarea>;
};

export default LogView;