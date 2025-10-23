import { CosmosClient, Database, Container } from "@azure/cosmos";

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
}

type HttpFunction = (context: Context, req: HttpRequest) => Promise<void>;

interface UserProfile {
    id: string;
    createdAt: string;
    updatedAt: string;
    name?: string;
    email?: string;
    expertise: string[];
    teams: string[];
    connections: string[];
}

let cosmosClient: CosmosClient | null = null;
let database: Database | null = null;
let container: Container | null = null;

const initializeCosmosClient = async (): Promise<void> => {
    if (!process.env.CosmosDBConnection) {
        throw new Error("CosmosDBConnection string not found in environment variables");
    }
    
    cosmosClient = new CosmosClient(process.env.CosmosDBConnection);
    database = cosmosClient.database("KnowledgeDB");
    container = database.container("Users");
};

const httpTrigger: HttpFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const principalId = req.headers["x-ms-client-principal-id"];
    
    if (!principalId) {
        context.res = {
            status: 401,
            body: { error: "Unauthorized - Missing user ID" }
        };
        return;
    }

    try {
        if (!container) {
            await initializeCosmosClient();
        }

        if (!container) {
            throw new Error("Failed to initialize database connection");
        }

        try {
            const { resource: profile } = await container.item(principalId, principalId).read<UserProfile>();
            
            if (profile) {
                context.res = {
                    status: 200,
                    body: profile
                };
                return;
            }
        } catch (err) {
            if ((err as any)?.code !== 404) {
                throw err;
            }
            
            // Create new user profile if it doesn't exist
            const newUser: UserProfile = {
                id: principalId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expertise: [],
                teams: [],
                connections: []
            };
            
            const { resource: createdUser } = await container.items.create<UserProfile>(newUser);
            
            context.res = {
                status: 200,
                body: createdUser
            };
            return;
        }
    } catch (error: unknown) {
        context.log("Error in getUserProfile:", error);
        
        context.res = {
            status: 500,
            body: {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "An unexpected error occurred"
            }
        };
    }
};

export default httpTrigger;