import { Text, Textarea } from "@chakra-ui/react"
import { useEffect, useState } from "react"

const LogView = () => {
    const [ws, setWs] = useState<WebSocket>();
    const [lastMessage, setLastMessage] = useState();
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        const url = new URL(
            "ws://" + process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/livelog`
        );
        const ws = new WebSocket(url);
        ws.onmessage = (msg) => {
            setLastMessage(msg.data);
        }
        window.onbeforeunload = () => {
            ws.onclose = () => { };
            ws.close();
        };
        setWs(ws);
        return () => {
            ws.close();
            setWs(undefined);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (lastMessage) {
            setMessages([...messages, lastMessage]);
        }
    }, [lastMessage])

    return <Textarea value={messages.join("")} height="60vh" readOnly></Textarea>
}

export default LogView