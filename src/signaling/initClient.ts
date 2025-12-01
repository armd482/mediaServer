import { Client } from "@stomp/stompjs";
import SockJs from "sockjs-client";

export const initClient = () => {
  const client = new Client({
    brokerURL: undefined,
    debug: (str) => console.log("[STOMP]", str),
    onConnect: () => {
      console.log("connected");
    },
    webSocketFactory: () =>
      new SockJs("http://localhost:8080/ws?userId=server"),
  });
  console.log("try connecting...");

  client.activate();
  return client;
};
