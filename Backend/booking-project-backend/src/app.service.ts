import { Injectable } from '@nestjs/common';

// the default app service.

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
