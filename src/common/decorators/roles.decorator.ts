import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Uso: @Roles('SINDICO', 'ADMIN_TENANT') acima do handler do controller.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
