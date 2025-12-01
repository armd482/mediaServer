import SockJs from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export const initClient = () => {
  const client = new Client({
    brokerURL: undefined,
    webSocketFactory: () => new SockJs('http://localhost:8080/ws?userId=server'),
    debug: (str) => console.log("[STOMP]", str),
    onConnect: () => {
      console.log('connected');
    }
  })
  console.log('try connecting...');

  client.activate();
  return client;
} 
