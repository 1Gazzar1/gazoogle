declare namespace NodeJS {
    interface ProcessEnv {
        PORT: number;
        POSTGRES_DB: string;
    }
}
