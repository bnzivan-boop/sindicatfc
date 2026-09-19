import { BadRequestException, Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import { ZodError, type ZodTypeAny } from 'zod';
import { ZOD_SCHEMA_KEY } from '../decorators/zod-body.decorator.js';

/**
 * Валидирует body/query по zod-схеме из @sindikat/domain, объявленной через @ZodBody()/@ZodQuery().
 * Одна и та же схема используется клиентами — контракт не расходится.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const schema = (metadata.metatype as { [ZOD_SCHEMA_KEY]?: ZodTypeAny } | undefined)?.[ZOD_SCHEMA_KEY];
    if (!schema) return value;
    try {
      return schema.parse(value);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          message: 'Ошибка валидации',
          issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      throw e;
    }
  }
}
