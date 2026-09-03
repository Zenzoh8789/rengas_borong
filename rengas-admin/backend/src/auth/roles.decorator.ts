import { SetMetadata } from "@nestjs/common";
import { Role } from "../entities";

export const ROLES_KEY = "allowedRoles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
