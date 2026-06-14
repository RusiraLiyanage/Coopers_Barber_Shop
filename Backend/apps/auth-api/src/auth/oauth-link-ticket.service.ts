import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const LINK_TICKET_PURPOSE = 'oauth_link';
const LINK_TICKET_TTL = '10m';

export type OAuthLinkTicketClaims = {
  provider: string;
  providerUserId: string;
  email: string;
  userId: string;
};

type SignedLinkTicketPayload = OAuthLinkTicketClaims & {
  purpose: typeof LINK_TICKET_PURPOSE;
};

// Issues the short-lived ticket that carries a Google identity the user still
// has to claim with their password. The ticket is signed with a key derived
// from JWT_SECRET — distinct from the access-token key — so it can never be
// replayed as an access token even though the JWT strategy does not bind
// sessions.
@Injectable()
export class OAuthLinkTicketService {
  private readonly secret: string;

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.secret = createHash('sha256')
      .update(`oauth-link-ticket:${config.getOrThrow<string>('JWT_SECRET')}`)
      .digest('hex');
  }

  sign(claims: OAuthLinkTicketClaims): string {
    return this.jwtService.sign(
      {
        ...claims,
        purpose: LINK_TICKET_PURPOSE,
      } satisfies SignedLinkTicketPayload,
      { secret: this.secret, expiresIn: LINK_TICKET_TTL },
    );
  }

  verify(ticket: string): OAuthLinkTicketClaims {
    let payload: SignedLinkTicketPayload;

    try {
      payload = this.jwtService.verify<SignedLinkTicketPayload>(ticket, {
        secret: this.secret,
      });
    } catch {
      throw new UnauthorizedException(
        'Google link request has expired. Please start again.',
      );
    }

    if (payload.purpose !== LINK_TICKET_PURPOSE) {
      throw new UnauthorizedException('Invalid Google link request.');
    }

    return {
      provider: payload.provider,
      providerUserId: payload.providerUserId,
      email: payload.email,
      userId: payload.userId,
    };
  }
}
