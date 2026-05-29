import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

/**
 * Authenticates a request via the `x-api-key` header instead of a JWT.
 * On success, attaches `request.workspaceId`. Use as a route-level guard
 * for machine-to-machine endpoints.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const raw = request.headers['x-api-key'];
    if (!raw || typeof raw !== 'string') {
      throw new UnauthorizedException('Missing x-api-key header');
    }
    const result = await this.apiKeysService.validate(raw);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }
    request.workspaceId = result.workspaceId;
    return true;
  }
}
