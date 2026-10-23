import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsUUID, ValidationOptions } from 'class-validator';

function normalizeUuid(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function UuidField(options?: { each?: boolean }): PropertyDecorator {
  const each = options?.each ?? false;
  const validation: ValidationOptions | undefined = each ? { each: true } : undefined;
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (each && Array.isArray(value)) {
        return value.map((item) => normalizeUuid(item));
      }
      return normalizeUuid(value);
    }),
    IsUUID('4', validation),
  );
}
