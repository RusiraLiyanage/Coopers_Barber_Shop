import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// The passport's auth guard.

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
