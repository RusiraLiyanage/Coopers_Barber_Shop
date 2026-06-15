import { All, Controller, NotFoundException, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { FrontendProxyService } from './frontend-proxy.service';

type FrontendProxyRequest = {
  method: string;
  originalUrl?: string;
  url?: string;
};

type FrontendProxyResponse = {
  status: (statusCode: number) => FrontendProxyResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: Buffer) => void;
  end: () => void;
};

@ApiExcludeController()
@SkipThrottle()
@Controller()
export class FrontendProxyController {
  constructor(private readonly frontendProxyService: FrontendProxyService) {}

  @All()
  async forwardFrontendRoot(
    @Req() request: FrontendProxyRequest,
    @Res() response: FrontendProxyResponse,
  ): Promise<void> {
    return this.forwardFrontendRequest(request, response);
  }

  @All('*path')
  async forwardFrontendPath(
    @Req() request: FrontendProxyRequest,
    @Res() response: FrontendProxyResponse,
  ): Promise<void> {
    return this.forwardFrontendRequest(request, response);
  }

  private async forwardFrontendRequest(
    request: FrontendProxyRequest,
    response: FrontendProxyResponse,
  ): Promise<void> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      throw new NotFoundException('Route not found.');
    }

    const originalUrl = request.originalUrl ?? request.url ?? '/';
    const result = await this.frontendProxyService.forward(originalUrl);

    response.status(result.statusCode);
    result.headers.forEach((value, key) => {
      if (this.frontendProxyService.shouldForwardHeader(key)) {
        response.setHeader(key, value);
      }
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    response.send(result.body);
  }
}
