import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the active workspace id from the `x-workspace-id` header
 * (or `workspaceId` query param fallback).
 */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers['x-workspace-id'] ||
      request.query?.workspaceId ||
      request.workspaceId
    );
  },
);
