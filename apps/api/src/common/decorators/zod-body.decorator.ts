import { Body, Query } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

export const ZOD_SCHEMA_KEY = Symbol('zodSchema');

/**
 * Nest передаёт в pipe `metatype` — класс параметра. Мы создаём класс-обёртку,
 * несущий zod-схему, чтобы ZodValidationPipe нашёл её без глобального реестра.
 */
function schemaClass<T extends ZodTypeAny>(schema: T) {
  const klass = class {};
  Object.defineProperty(klass, ZOD_SCHEMA_KEY, { value: schema });
  return klass as unknown as new () => z.infer<T>;
}

/** Использование: `create(@ZodBody(createCatchSchema) dto: CreateCatch)` */
export function ZodBody<T extends ZodTypeAny>(schema: T): ParameterDecorator {
  const klass = schemaClass(schema);
  return (target, key, index) => {
    Reflect.defineMetadata('design:paramtypes', patchParamTypes(target, key, index, klass), target, key!);
    Body()(target, key, index);
  };
}

export function ZodQuery<T extends ZodTypeAny>(schema: T): ParameterDecorator {
  const klass = schemaClass(schema);
  return (target, key, index) => {
    Reflect.defineMetadata('design:paramtypes', patchParamTypes(target, key, index, klass), target, key!);
    Query()(target, key, index);
  };
}

function patchParamTypes(target: object, key: string | symbol | undefined, index: number, klass: unknown) {
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', target, key!) ?? [];
  const next = [...types];
  next[index] = klass;
  return next;
}
