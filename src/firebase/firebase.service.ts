import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private database?: Firestore;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.getOrThrow<string>('FIREBASE_PROJECT_ID');
    const emulatorHost = this.config.get<string>('FIRESTORE_EMULATOR_HOST');

    if (getApps().length === 0) {
      if (emulatorHost) {
        process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
        initializeApp({ projectId });
      } else {
        const clientEmail = this.config.getOrThrow<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = normalizePrivateKey(
          this.config.getOrThrow<string>('FIREBASE_PRIVATE_KEY'),
        );
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      }
    }

    this.database = getFirestore();
    try {
      this.database.settings({ ignoreUndefinedProperties: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.toLowerCase().includes('already')) {
        throw error;
      }
    }
  }

  get firestore(): Firestore {
    return this.getFirestore();
  }

  getFirestore(): Firestore {
    if (!this.database) {
      throw new Error('Firestore is not initialized');
    }
    return this.database;
  }
}

function normalizePrivateKey(raw: string): string {
  const unquoted = raw.replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
  return unquoted.replace(/\\n/g, '\n');
}
