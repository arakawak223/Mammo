import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'critical' | 'high' | 'normal';
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private logger = new Logger('NotificationsService');
  private fcmInitialized = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.initFcm();
  }

  private initFcm() {
    const serviceAccount = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccount) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT not set. Push notifications in dev-log mode.');
      return;
    }

    try {
      const credential = JSON.parse(serviceAccount);
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(credential),
        });
      }
      this.fcmInitialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async sendToDevices(tokens: string[], message: PushMessage) {
    if (!this.fcmInitialized) {
      this.logger.debug(`[DEV] Push: ${message.title} -> ${tokens.length} devices`);
      this.logger.debug(`[DEV] Body: ${message.body}`);
      this.logger.debug(`[DEV] Data: ${JSON.stringify(message.data)}`);
      return;
    }

    const androidConfig = this.getAndroidConfig(message.priority);
    const apnsConfig = this.getApnsConfig(message.priority);

    const results = await Promise.allSettled(
      tokens.map((token) =>
        admin
          .messaging()
          .send({
            token,
            notification: { title: message.title, body: message.body },
            data: message.data,
            android: androidConfig,
            apns: apnsConfig,
          })
          .catch(async (error) => {
            // Clear invalid tokens
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              this.logger.warn(`Clearing invalid device token: ${token.substring(0, 8)}...`);
              await this.prisma.user.updateMany({
                where: { deviceToken: token },
                data: { deviceToken: null },
              });
            }
            throw error;
          }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`Push sent: ${succeeded} succeeded, ${failed} failed out of ${tokens.length}`);
  }

  private getAndroidConfig(priority?: string): admin.messaging.AndroidConfig {
    return {
      priority: 'high',
      notification: {
        channelId: priority === 'critical' ? 'emergency' : 'alerts',
        sound: priority === 'critical' ? 'alarm.mp3' : 'default',
      },
    };
  }

  private getApnsConfig(priority?: string): admin.messaging.ApnsConfig {
    return {
      payload: {
        aps: {
          sound:
            priority === 'critical'
              ? { critical: true as any, name: 'alarm.caf', volume: 1.0 }
              : 'default',
          'interruption-level': priority === 'critical' ? 'critical' : 'active',
        },
      },
    };
  }
}
