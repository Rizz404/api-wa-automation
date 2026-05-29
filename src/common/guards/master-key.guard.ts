import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protects internal/inbound endpoints (e.g. OpenWA event callbacks) with the
 * shared OPENWA master key passed via the `x-master-key` header.
 */
@Injectable()
export class MasterKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-master-key'];
    const expected = this.config.get<string>('openwa.masterKey');
    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid master key');
    }
    return true;
  }
}
