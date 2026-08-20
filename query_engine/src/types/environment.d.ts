declare namespace NodeJS {
    interface ProcessEnv {
        PORT: number;
        POSTGRES_DB: string;
        EMBEDDING_URL: string;
    }
}
