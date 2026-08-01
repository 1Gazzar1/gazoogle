export class CustomError extends Error {
    statusCode: number;
    constructor(name: string, statusCode: number, message: string) {
        super();
        this.name = name;
        this.statusCode = statusCode;
        this.message = message;
    }
}

export function createError(
    message: string,
    name: string = "Error",
    statusCode: number = 500,
): CustomError {
    const customError = new CustomError(name, statusCode, message);
    return customError;
}

export const ERRORS = {
    NOTFOUND: (message: string) => createError(message, "NOTFOUND", 404),
    BAD_REQUEST: (message: string) => createError(message, "BAD_REQUEST", 400),
    INTERNAL: (message: string) => createError(message, "INTERNAL", 500),
} as const;
