import { CosmosClient } from "@azure/cosmos";
import * as signalR from "@microsoft/signalr";

interface HttpRequest {
    method?: string;
    url?: string;
    headers: { [key: string]: string };
    query?: { [key: string]: string };
    params?: { [key: string]: string };
    body?: any;
}

interface Context {
    log: (...args: any[]) => void;
    res: {
        status?: number;
        body?: any;
        headers?: { [key: string]: string };
    };
    bindings: {
        signalRMessages?: any[];
    };
}

type HttpFunction = (context: Context, req: HttpRequest) => Promise<void>;

const httpTrigger: HttpFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const userId = req.headers["x-ms-client-principal-id"];
    if (!userId) {
        context.res = {
            status: 401,
            body: "Unauthorized"
        };
        return;
    }

    try {
        if (!process.env.CosmosDBConnection) {
            throw new Error("CosmosDBConnection is not configured");
        }
        const client = new CosmosClient(process.env.CosmosDBConnection);
        const database = client.database("KnowledgeDB");
        const container = database.container("Messages");

        switch (req.method) {
            case "GET":
                // Get messages
                const { resources: messages } = await container.items
                    .query({
                        query: "SELECT * FROM c WHERE c.recipientId = @userId OR c.senderId = @userId ORDER BY c._ts DESC",
                        parameters: [{ name: "@userId", value: userId }]
                    })
                    .fetchAll();

                context.res = {
                    status: 200,
                    body: messages
                };
                break;

            case "POST":
                // Send message
                const { recipientId, content } = req.body;
                if (!recipientId || !content) {
                    context.res = {
                        status: 400,
                        body: "Missing required fields"
                    };
                    return;
                }

                const message = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    senderId: userId,
                    recipientId,
                    content,
                    createdAt: new Date().toISOString(),
                    read: false
                };

                const { resource: createdMessage } = await container.items.create(message);

                // Send real-time notification using SignalR
                context.bindings.signalRMessages = [{
                    target: "newMessage",
                    arguments: [createdMessage]
                }];

                context.res = {
                    status: 201,
                    body: createdMessage
                };
                break;

            default:
                context.res = {
                    status: 405,
                    body: "Method not allowed"
                };
        }
    } catch (error) {
        context.res = {
            status: 500,
            body: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        };
    }
};

export default httpTrigger;