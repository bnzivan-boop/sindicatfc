import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  createParamDecorator,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

/**
 * Требует заголовок Idempotency-Key на изменяющих запросах (handoff, раздел 8).
 * Хранение и повтор ответа по ключу реализуют сервисы, которым это критично
 * (регистрация, оплата, отправка результата) — см. поля idempotencyKey в схеме.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx
      .switchToHttp()
      .getRequest<{ method: string; headers: Record<string, string | undefined>; idempotencyKey?: string }>();
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const key = req.headers['idempotency-key'];
      if (!key || key.length < 8 || key.length > 128) {
        throw new BadRequestException('Требуется заголовок Idempotency-Key (8–128 символов)');
      }
      req.idempotencyKey = key;
    }
    return next.handle();
  }
}

/** Достаёт ключ, проверенный IdempotencyInterceptor. */
export const IdempotencyKey = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest<{ idempotencyKey: string }>().idempotencyKey;
});
