import Joi from 'joi';

const booleanFlag = (fallback: boolean) =>
  Joi.boolean().truthy('true').falsy('false').default(fallback);

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  DB_HOST: Joi.string().default('127.0.0.1'),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: booleanFlag(false),
  DB_MIGRATIONS_RUN: booleanFlag(true),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIRESTORE_EMULATOR_HOST: Joi.string().allow('').optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),
}).custom((value: Record<string, unknown>, helpers) => {
  const emulator =
    typeof value.FIRESTORE_EMULATOR_HOST === 'string' ? value.FIRESTORE_EMULATOR_HOST.trim() : '';
  if (!emulator && (!value.FIREBASE_CLIENT_EMAIL || !value.FIREBASE_PRIVATE_KEY)) {
    return helpers.error('any.custom', {
      message: 'Set FIRESTORE_EMULATOR_HOST or Firebase service account credentials',
    });
  }
  return value;
});

export function readBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true';
}
