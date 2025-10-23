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

const httpTrigger: HttpFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const userId = req.headers["x-ms-client-principal-id"];
    if (!userId) {
        context.res = {
            status: 401,
            body: "Unauthorized"
        };
        return;
    }

    context.res = {
        body: {
            userId
        }
    };
};

export default httpTrigger;