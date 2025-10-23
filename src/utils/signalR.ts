import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

let connection: HubConnection | null = null;

export async function startSignalRConnection(_accessToken: string): Promise<HubConnection> {
    if (connection) {
        return connection;
    }

    connection = new HubConnectionBuilder()
        .withUrl(`${import.meta.env.VITE_API_ENDPOINT}/api`)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

    connection.on("newMessage", (_message) => {
        // This event will be handled by the MessagingDialog component
    });

    try {
        await connection.start();
        console.log("SignalR Connected.");
        return connection;
    } catch (err) {
        console.error("SignalR Connection Error: ", err);
        throw err;
    }
}

export async function stopSignalRConnection(): Promise<void> {
    if (connection) {
        try {
            await connection.stop();
            connection = null;
            console.log("SignalR Disconnected.");
        } catch (err) {
            console.error("SignalR Disconnect Error: ", err);
            throw err;
        }
    }
}

export function getSignalRConnection(): HubConnection | null {
    return connection;
}