import * as signalR from "@microsoft/signalr";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
    path: path.resolve(process.cwd(), '../../../', '.env')
});

const CS_SERVER_URL =
  process.env.CS_SERVER_URL || "http://localhost:5000";
const HUB_URL = `${CS_SERVER_URL}/logHub`;

class SignalRService {
  private connection: signalR.HubConnection;
  public onLogReceived: ((logEntry: string, timestamp: string) => void) | null =
    null;
  public onConnectionStateChanged: ((isConnected: boolean) => void) | null =
    null;

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {})
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.on("ReceiveLogEntry", (logEntry: string) => {
      const timestamp = new Date().toLocaleTimeString();
      if (this.onLogReceived) {
        this.onLogReceived(logEntry, timestamp);
      }
    });

    this.connection.onreconnecting((error) => {
      console.warn(
        `SignalR connection lost. Attempting to reconnect... Error: ${error}`
      );
      if (this.onConnectionStateChanged) this.onConnectionStateChanged(false);
    });

    this.connection.onreconnected((connectionId) => {
      console.log(
        `SignalR connection re-established. Connection ID: ${connectionId}`
      );
      if (this.onConnectionStateChanged) this.onConnectionStateChanged(true);
    });

    this.connection.onclose((error) => {
      console.warn(`SignalR connection closed. Error: ${error}`);
      if (this.onConnectionStateChanged) this.onConnectionStateChanged(false);
    });
  }

  public async startConnection() {
    try {
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        console.log("SignalR Connected to LogHub.");
        if (this.onConnectionStateChanged) this.onConnectionStateChanged(true);
      }
    } catch (err) {
      console.error("SignalR Connection Error during start: ", err);
      if (this.onConnectionStateChanged) this.onConnectionStateChanged(false);
    }
  }

  public async stopConnection() {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.stop();
      console.log("SignalR Disconnected from LogHub.");
      if (this.onConnectionStateChanged) this.onConnectionStateChanged(false);
    }
  }

  public getConnectionState(): signalR.HubConnectionState {
    return this.connection.state;
  }
}

export const signalRLogService = new SignalRService();
