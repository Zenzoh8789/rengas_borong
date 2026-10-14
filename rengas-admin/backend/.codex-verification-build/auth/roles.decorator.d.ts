import { Role } from "../entities";
export declare const ROLES_KEY = "allowedRoles";
export declare const Roles: (...roles: Role[]) => import("@nestjs/common").CustomDecorator<string>;
