import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AuthTokensResponse } from '@coopers/common';

const REFRESH_REUSE_WINDOW_MS = 5000;

type RefreshTokenCacheEntry = {
  expiresAt: number;
  tokens: AuthTokensResponse;
};

@Injectable()
export class RefreshTokenCoordinatorService {
  private readonly inFlightRefreshes = new Map<
    string,
    Promise<AuthTokensResponse>
  >();
  private readonly recentlyRotatedTokens = new Map<
    string,
    RefreshTokenCacheEntry
  >();

  async getOrRefresh(
    refreshToken: string,
    refresh: () => Promise<AuthTokensResponse>,
  ): Promise<AuthTokensResponse> {
    const tokenKey = this.hashRefreshToken(refreshToken);
    const cachedTokens = this.getRecentlyRotatedTokens(tokenKey);

    if (cachedTokens) {
      return cachedTokens;
    }

    const currentRefresh = this.inFlightRefreshes.get(tokenKey);

    if (currentRefresh !== undefined) {
      return currentRefresh;
    }

    const refreshPromise = refresh()
      .then((tokens) => {
        this.recentlyRotatedTokens.set(tokenKey, {
          tokens,
          expiresAt: Date.now() + REFRESH_REUSE_WINDOW_MS,
        });

        return tokens;
      })
      .finally(() => {
        this.inFlightRefreshes.delete(tokenKey);
      });

    this.inFlightRefreshes.set(tokenKey, refreshPromise);

    return refreshPromise;
  }

  private getRecentlyRotatedTokens(
    tokenKey: string,
  ): AuthTokensResponse | undefined {
    const cachedTokens = this.recentlyRotatedTokens.get(tokenKey);

    if (cachedTokens === undefined) {
      return undefined;
    }

    if (cachedTokens.expiresAt <= Date.now()) {
      this.recentlyRotatedTokens.delete(tokenKey);
      return undefined;
    }

    return cachedTokens.tokens;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
