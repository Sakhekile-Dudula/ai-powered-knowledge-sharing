declare namespace Deno {
    export const env: {
        get(key: string): string | undefined;
        set(key: string, value: string): void;
        toObject(): { [key: string]: string };
    };
}