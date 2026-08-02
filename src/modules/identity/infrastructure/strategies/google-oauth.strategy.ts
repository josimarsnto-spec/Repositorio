import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

// OAuth2 Login social (síndicos/administradoras que preferem SSO com Google Workspace).
@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('googleOAuth.clientId'),
      clientSecret: config.get<string>('googleOAuth.clientSecret'),
      callbackURL: config.get<string>('googleOAuth.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails } = profile;
    const user = {
      email: emails[0].value,
      nome: `${name.givenName} ${name.familyName}`,
    };
    done(null, user);
  }
}
