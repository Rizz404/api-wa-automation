/** Generic OpenWA REST response envelope. */
export interface OpenwaResponse<T = any> {
  success?: boolean;
  response?: T;
  error?: string;
  [key: string]: any;
}

export interface OpenwaSendResult {
  /** WhatsApp message id (e.g. true_628xxx@c.us_3EB0...). */
  messageId?: string;
}
