import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const database = {
    DB_USERNAME: 'chat',
    DB_PASSWORD: 'chat',
    DB_DATABASE: 'chat',
  };

  it('accepts the Firestore emulator without a service account', () => {
    const { error } = envValidationSchema.validate({
      ...database,
      FIREBASE_PROJECT_ID: 'demo-chat',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    });

    expect(error).toBeUndefined();
  });

  it('requires Firebase credentials when the emulator host is unset', () => {
    const { error } = envValidationSchema.validate({
      ...database,
      FIREBASE_PROJECT_ID: 'demo-chat',
    });

    expect(error).toBeDefined();
  });
});
