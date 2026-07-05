import { Role } from "@prisma/client";

interface AuthUser {
    id: number;
    username: string;
    email: string;
    role: Role;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export {};