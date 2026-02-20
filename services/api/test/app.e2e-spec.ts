import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MamoriTalk API (e2e)', () => {
  let app: INestApplication;

  // Shared state across tests
  let elderlyToken: string;
  let familyToken: string;
  let elderlyId: string;
  let familyId: string;
  let inviteCode: string;
  let pairingId: string;
  let eventId: string;
  let sosSessionId: string;

  // Use unique phone numbers to avoid conflicts with previous test runs
  const suffix = Date.now().toString().slice(-7);
  const elderlyPhone = `0901${suffix}`;
  const familyPhone = `0801${suffix}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // Health Check
  // ==========================================
  describe('GET /api/v1/health', () => {
    it('should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('mamoritalk-api');
        });
    });
  });

  // ==========================================
  // Auth: Registration & Login
  // ==========================================
  describe('Auth', () => {
    it('POST /auth/register - register elderly user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: elderlyPhone,
          password: 'Test1234',
          name: 'テスト高齢者',
          role: 'elderly',
        })
        .expect(201);

      expect(res.body.user.phone).toBe(elderlyPhone);
      expect(res.body.user.role).toBe('elderly');
      expect(res.body.accessToken).toBeDefined();
      elderlyToken = res.body.accessToken;
      elderlyId = res.body.user.id;
    });

    it('POST /auth/register - register family user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: familyPhone,
          password: 'Test1234',
          name: 'テスト家族',
          role: 'family_owner',
        })
        .expect(201);

      expect(res.body.user.role).toBe('family_owner');
      familyToken = res.body.accessToken;
      familyId = res.body.user.id;
    });

    it('POST /auth/register - duplicate phone returns 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: elderlyPhone,
          password: 'Test1234',
          name: '重複',
          role: 'elderly',
        })
        .expect(409);
    });

    it('POST /auth/login - valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: elderlyPhone, password: 'Test1234' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      elderlyToken = res.body.accessToken;
    });

    it('POST /auth/login - invalid password returns 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: elderlyPhone, password: 'wrongpwd1' })
        .expect(401);
    });

    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pairings')
        .expect(401);
    });
  });

  // ==========================================
  // Pairing Flow
  // ==========================================
  describe('Pairing', () => {
    it('POST /pairings - create invite code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/pairings')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({ elderlyId })
        .expect(201);

      expect(res.body.code).toBeDefined();
      inviteCode = res.body.code;
    });

    it('POST /pairings/join - family joins with invite code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/pairings/join')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ code: inviteCode })
        .expect(201);

      expect(res.body.elderlyId).toBe(elderlyId);
      expect(res.body.familyId).toBe(familyId);
      pairingId = res.body.id;
    });

    it('GET /pairings - list pairings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pairings')
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200);

      expect(res.body.asFamily).toBeDefined();
      expect(Array.isArray(res.body.asFamily)).toBe(true);
      expect(res.body.asFamily.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // F1: Scam Button Event + AI Analysis
  // ==========================================
  describe('F1: Scam Button', () => {
    it('POST /events - create scam_button event', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({
          type: 'scam_button',
          severity: 'high',
          payload: {
            conversationText: '口座が凍結されました。暗証番号を教えてください。至急ATMで手続きしてください。',
          },
        })
        .expect(201);

      expect(res.body.type).toBe('scam_button');
      expect(res.body.severity).toBe('high');
      eventId = res.body.id;
    });

    it('GET /events/:id - should include AI analysis after processing', async () => {
      // Wait for async AI analysis to complete
      await new Promise((r) => setTimeout(r, 2000));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(res.body.id).toBe(eventId);
      expect(res.body.aiAnalysis).toBeDefined();
      expect(res.body.aiAnalysis.riskScore).toBeGreaterThanOrEqual(50);
      expect(res.body.aiAnalysis.scamType).toBeDefined();
    });

    it('GET /events/elderly/:elderlyId - list events with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/elderly/${elderlyId}`)
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
    });

    it('PATCH /events/:id/resolve - family resolves event', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}/resolve`)
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200);

      expect(res.body.status).toBe('resolved');
      expect(res.body.resolvedBy).toBe(familyId);
    });
  });

  // ==========================================
  // F2: Auto Forward Event
  // ==========================================
  describe('F2: Auto Forward', () => {
    it('POST /events - auto_forward with international number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({
          type: 'auto_forward',
          severity: 'medium',
          payload: {
            phoneNumber: '+44123456789',
            callType: 'sms',
            smsContent: 'お届け物をお届けにあがりましたが不在でした。再配達はこちら http://evil.example.com',
          },
        })
        .expect(201);

      expect(res.body.type).toBe('auto_forward');
    });

    it('POST /events - auto_forward with safe domestic number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({
          type: 'auto_forward',
          severity: 'low',
          payload: {
            phoneNumber: '09098765432',
            callType: 'call',
          },
        })
        .expect(201);

      expect(res.body.type).toBe('auto_forward');
    });
  });

  // ==========================================
  // Blocklist
  // ==========================================
  describe('Blocklist', () => {
    let blockedNumberId: string;

    it('POST /elderly/:id/blocklist - add number', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/elderly/${elderlyId}/blocklist`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ phoneNumber: '+1555000111', reason: 'E2Eテスト' })
        .expect(201);

      expect(res.body.phoneNumber).toBe('+1555000111');
      blockedNumberId = res.body.id;
    });

    it('GET /elderly/:id/blocklist - list numbers', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/elderly/${elderlyId}/blocklist`)
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('DELETE /elderly/:id/blocklist/:numberId - remove number', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/elderly/${elderlyId}/blocklist/${blockedNumberId}`)
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200);

      expect(res.body.message).toBe('ブロック解除しました');
    });

    it('should reject blocklist access for non-family member', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/elderly/${elderlyId}/blocklist`)
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(403);
    });
  });

  // ==========================================
  // F9: SOS Flow
  // ==========================================
  describe('F9: SOS', () => {
    it('POST /sos/start - start SOS session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sos/start')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({
          latitude: 35.6812,
          longitude: 139.7671,
          mode: 'alarm',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.mode).toBe('alarm');
      expect(res.body.status).toBe('active');
      sosSessionId = res.body.id;
    });

    it('POST /sos/:id/location - update location', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sos/${sosSessionId}/location`)
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({
          latitude: 35.6815,
          longitude: 139.7675,
          accuracy: 10,
          battery: 80,
        })
        .expect(201);

      expect(res.body.locations.length).toBeGreaterThanOrEqual(2);
    });

    it('PATCH /sos/:id/mode - family changes mode', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/sos/${sosSessionId}/mode`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ mode: 'silent' })
        .expect(200);

      expect(res.body.mode).toBe('silent');
    });

    it('GET /sos/:id - get session details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/sos/${sosSessionId}`)
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200);

      expect(res.body.id).toBe(sosSessionId);
      expect(res.body.mode).toBe('silent');
    });

    it('POST /sos/:id/resolve - family resolves SOS', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sos/${sosSessionId}/resolve`)
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(201);

      expect(res.body.status).toBe('resolved');
    });

    it('should reject mode change on resolved session', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/sos/${sosSessionId}/mode`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ mode: 'alarm' })
        .expect(404);
    });
  });

  // ==========================================
  // Auth: Refresh & Logout
  // ==========================================
  describe('Auth: Refresh & Logout', () => {
    let refreshTokenValue: string;

    it('POST /auth/login - get refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: elderlyPhone, password: 'Test1234' })
        .expect(201);

      expect(res.body.refreshToken).toBeDefined();
      refreshTokenValue = res.body.refreshToken;
      elderlyToken = res.body.accessToken;
    });

    it('POST /auth/refresh - should return new tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshTokenValue })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      elderlyToken = res.body.accessToken;
    });

    it('POST /auth/refresh - old token should be invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshTokenValue })
        .expect(401);
    });

    it('POST /auth/logout - should revoke all tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(201);

      expect(res.body.message).toBe('ログアウトしました');
      expect(res.body.revokedTokens).toBeGreaterThanOrEqual(0);
    });

    it('POST /auth/logout - requires authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    // Re-login for remaining tests
    it('POST /auth/login - re-login after logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: elderlyPhone, password: 'Test1234' })
        .expect(201);

      elderlyToken = res.body.accessToken;
    });
  });

  // ==========================================
  // Health Check: Dependencies
  // ==========================================
  describe('Health: Dependencies', () => {
    it('should return dependencies status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toHaveProperty('dependencies');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.dependencies).toHaveProperty('database');
      expect(res.body.dependencies).toHaveProperty('redis');
      expect(res.body.dependencies).toHaveProperty('ai');
      expect(res.body.dependencies.database).toHaveProperty('responseTime');
    });

    it('should always return HTTP 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      // status can be 'ok' or 'degraded', but always 200
      expect(['ok', 'degraded']).toContain(res.body.status);
    });
  });

  // ==========================================
  // Input Validation
  // ==========================================
  describe('Validation', () => {
    let validToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: elderlyPhone, password: 'Test1234' });
      validToken = res.body.accessToken;
    });

    it('should reject event with invalid type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'invalid_type',
          severity: 'high',
        })
        .expect(400);
    });

    it('should reject event with invalid severity', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'scam_button',
          severity: 'extreme',
        })
        .expect(400);
    });

    it('should reject registration with missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '09000000000' })
        .expect(400);
    });

    it('should reject registration with invalid role', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '09099999999',
          password: 'Test1234',
          name: 'テスト',
          role: 'admin',
        })
        .expect(400);
    });
  });
});
