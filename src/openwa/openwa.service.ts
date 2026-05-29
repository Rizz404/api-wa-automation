import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { OpenwaResponse } from './dto/openwa-response.dto';

export interface OpenwaCredentials {
  baseUrl: string;
  apiKey: string;
}

/**
 * Thin wrapper around the OpenWA (open-wa) EASY API HTTP server.
 *
 * The EASY API exposes every wa-automate function as `POST /{method}` with a
 * JSON body `{ args: { ... } }` and an `api_key` header. Multi-session servers
 * accept a `?session=<id>` query string. This wrapper is multi-tenant: every
 * call receives the per-workspace credentials.
 */
@Injectable()
export class OpenwaService {
  private readonly logger = new Logger(OpenwaService.name);

  private client(creds: OpenwaCredentials): AxiosInstance {
    return axios.create({
      baseURL: creds.baseUrl.replace(/\/$/, ''),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        api_key: creds.apiKey,
      },
    });
  }

  async call<T = any>(
    creds: OpenwaCredentials,
    method: string,
    args: Record<string, any> = {},
    sessionId?: string,
  ): Promise<OpenwaResponse<T>> {
    const url = sessionId
      ? `/${method}?session=${encodeURIComponent(sessionId)}`
      : `/${method}`;
    try {
      const { data } = await this.client(creds).post<OpenwaResponse<T>>(url, {
        args,
      });
      return data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status || 502;
      const body = axiosErr.response?.data || axiosErr.message;
      this.logger.error(
        `OpenWA call '${method}' failed (${status}): ${JSON.stringify(body)}`,
      );
      throw new HttpException(
        { error: 'OpenWAError', message: `OpenWA '${method}' failed`, detail: body },
        status >= 400 && status < 600 ? status : 502,
      );
    }
  }

  // --- Session management ---

  async startSession(creds: OpenwaCredentials, sessionId: string) {
    return this.call(creds, 'start', {}, sessionId);
  }

  async terminateSession(creds: OpenwaCredentials, sessionId: string) {
    return this.call(creds, 'kill', {}, sessionId);
  }

  async getConnectionState(creds: OpenwaCredentials, sessionId: string) {
    return this.call<string>(creds, 'getConnectionState', {}, sessionId);
  }

  async getQrCode(creds: OpenwaCredentials, sessionId: string) {
    // Returns a base64 data URI for the login QR.
    return this.call<string>(creds, 'getQrPng', {}, sessionId);
  }

  async getHostNumber(creds: OpenwaCredentials, sessionId: string) {
    return this.call<string>(creds, 'getHostNumber', {}, sessionId);
  }

  // --- Messaging ---

  private toChatId(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return phone.includes('@') ? phone : `${digits}@c.us`;
  }

  async sendText(
    creds: OpenwaCredentials,
    sessionId: string,
    phone: string,
    message: string,
  ) {
    return this.call<string>(
      creds,
      'sendText',
      { to: this.toChatId(phone), content: message },
      sessionId,
    );
  }

  async sendImage(
    creds: OpenwaCredentials,
    sessionId: string,
    phone: string,
    imageUrl: string,
    caption = '',
    filename = 'image.jpg',
  ) {
    return this.call<string>(
      creds,
      'sendImage',
      { to: this.toChatId(phone), url: imageUrl, filename, caption },
      sessionId,
    );
  }

  async sendFile(
    creds: OpenwaCredentials,
    sessionId: string,
    phone: string,
    fileUrl: string,
    filename: string,
    caption = '',
  ) {
    return this.call<string>(
      creds,
      'sendFile',
      { to: this.toChatId(phone), url: fileUrl, filename, caption },
      sessionId,
    );
  }
}
