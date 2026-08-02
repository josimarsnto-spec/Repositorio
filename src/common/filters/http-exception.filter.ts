import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Formata erros no padrão RFC 7807 (Problem Details), conforme convenção de API
// definida no Documento de Arquitetura Técnica (seção 7.1).
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno inesperado';

    response.status(status).json({
      type: `https://condosphere.dev/errors/${status}`,
      title: HttpStatus[status] ?? 'Internal Server Error',
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
