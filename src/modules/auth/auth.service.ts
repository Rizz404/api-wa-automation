import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private refreshKey(userId: string): string {
    return `refresh:${userId}`;
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn') as any,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') as any,
    });
    // 30 days TTL (ms) for the stored refresh token.
    await this.cache.set(this.refreshKey(payload.sub), refreshToken, 2_592_000_000);
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const tokens = await this.issueTokens({ sub: user.id, email: user.email });
    return { user: { id: user.id, name: user.name, email: user.email }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.validateCredentials(
      dto.email,
      dto.password,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.issueTokens({ sub: user.id, email: user.email });
    return { user: { id: user.id, name: user.name, email: user.email }, ...tokens };
  }

  async refresh(userId: string, email: string, presentedToken: string) {
    const stored = await this.cache.get<string>(this.refreshKey(userId));
    if (!stored || stored !== presentedToken) {
      throw new UnauthorizedException('Refresh token revoked or invalid');
    }
    return this.issueTokens({ sub: userId, email });
  }

  async logout(userId: string) {
    await this.cache.del(this.refreshKey(userId));
    return { message: 'Logged out' };
  }
}
