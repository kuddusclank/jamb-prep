/**
 * Production SMTP Client for Cloudflare Workers & Node.js
 *
 * Implements direct TLS SMTP on port 465 using `cloudflare:sockets` (secureTransport: 'on')
 * with graceful fallback to `node:tls` in native Node.js environments.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface SendMailOptions {
  from: string;
  to: string;
  rawMessage: string;
}

export interface SmtpSendResult {
  accepted: boolean;
  messageId?: string;
  response: string;
}

export class SmtpClient {
  config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  async sendMail(options: SendMailOptions): Promise<SmtpSendResult> {
    const isCloudflare = typeof (globalThis as any).WebSocketPair !== 'undefined' || !!(globalThis as any).navigator?.userAgent?.includes('Cloudflare');

    if (isCloudflare) {
      try {
        return await this.sendViaCloudflareSockets(options);
      } catch (err: any) {
        // Fallback to node:tls if cloudflare:sockets fails
        return await this.sendViaNodeTls(options);
      }
    } else {
      return await this.sendViaNodeTls(options);
    }
  }

  private async sendViaCloudflareSockets(options: SendMailOptions): Promise<SmtpSendResult> {
    // @ts-ignore cloudflare:sockets is provided by Cloudflare Workers runtime
    const { connect } = await import('cloudflare:sockets');
    const socket = connect(
      {
        hostname: this.config.host,
        port: this.config.port,
      },
      {
        secureTransport: 'on',
        allowHalfOpen: false,
      }
    );

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let buffer = '';

    const readLine = async (): Promise<string> => {
      while (!buffer.includes('\r\n')) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      const idx = buffer.indexOf('\r\n');
      if (idx !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        return line;
      }
      const line = buffer;
      buffer = '';
      return line;
    };

    const readResponse = async (): Promise<{ code: number; line: string }> => {
      while (true) {
        const line = await readLine();
        if (!line.trim()) continue;
        const code = parseInt(line.slice(0, 3), 10);
        const isContinuation = line.charAt(3) === '-';
        if (!isContinuation) {
          return { code, line };
        }
      }
    };

    const sendCmd = async (cmd: string): Promise<{ code: number; line: string }> => {
      await writer.write(encoder.encode(cmd + '\r\n'));
      return await readResponse();
    };

    try {
      // 1. Initial Greeting
      const greeting = await readResponse();
      if (greeting.code !== 220) {
        throw new Error(`SMTP Greeting failed: ${greeting.line}`);
      }

      // 2. EHLO
      const ehlo = await sendCmd(`EHLO ${this.config.host}`);
      if (ehlo.code !== 250) {
        throw new Error(`SMTP EHLO failed: ${ehlo.line}`);
      }

      // 3. AUTH LOGIN
      const auth = await sendCmd('AUTH LOGIN');
      if (auth.code !== 334) {
        throw new Error(`SMTP AUTH LOGIN failed: ${auth.line}`);
      }

      // 4. Send Base64 Username
      const userB64 = btoa(this.config.user);
      const userRes = await sendCmd(userB64);
      if (userRes.code !== 334) {
        throw new Error(`SMTP User auth failed: ${userRes.line}`);
      }

      // 5. Send Base64 Password
      const passB64 = btoa(this.config.pass);
      const passRes = await sendCmd(passB64);
      if (passRes.code !== 235) {
        throw new Error(`SMTP Password auth failed: ${passRes.line}`);
      }

      // 6. MAIL FROM
      const mailFrom = await sendCmd(`MAIL FROM:<${options.from}>`);
      if (mailFrom.code !== 250) {
        throw new Error(`SMTP MAIL FROM failed: ${mailFrom.line}`);
      }

      // 7. RCPT TO
      const rcptTo = await sendCmd(`RCPT TO:<${options.to}>`);
      if (rcptTo.code !== 250) {
        throw new Error(`SMTP RCPT TO failed: ${rcptTo.line}`);
      }

      // 8. DATA
      const dataRes = await sendCmd('DATA');
      if (dataRes.code !== 354) {
        throw new Error(`SMTP DATA prompt failed: ${dataRes.line}`);
      }

      // 9. Send payload ending with CRLF.CRLF
      const payload = options.rawMessage.endsWith('\r\n.\r\n')
        ? options.rawMessage
        : options.rawMessage.replace(/\r?\n\.\r?\n?$/, '') + '\r\n.\r\n';

      await writer.write(encoder.encode(payload));
      const endRes = await readResponse();
      if (endRes.code !== 250) {
        throw new Error(`SMTP message rejected: ${endRes.line}`);
      }

      // 10. QUIT
      try {
        await sendCmd('QUIT');
      } catch {
        // ignore quit error
      }

      return {
        accepted: true,
        response: endRes.line,
      };
    } finally {
      try {
        await writer.close();
      } catch {}
      try {
        await socket.close();
      } catch {}
    }
  }

  private async sendViaNodeTls(options: SendMailOptions): Promise<SmtpSendResult> {
    const tls = await import('node:tls');

    return new Promise((resolve, reject) => {
      const socket = tls.connect(this.config.port, this.config.host, { rejectUnauthorized: false });

      let step = 0;
      let buffer = '';

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const code = parseInt(line.slice(0, 3), 10);
          if (line.charAt(3) === '-') continue;

          if (step === 0 && code === 220) {
            step = 1;
            socket.write(`EHLO ${this.config.host}\r\n`);
          } else if (step === 1 && code === 250) {
            step = 2;
            socket.write('AUTH LOGIN\r\n');
          } else if (step === 2 && code === 334) {
            step = 3;
            socket.write(Buffer.from(this.config.user).toString('base64') + '\r\n');
          } else if (step === 3 && code === 334) {
            step = 4;
            socket.write(Buffer.from(this.config.pass).toString('base64') + '\r\n');
          } else if (step === 4 && code === 235) {
            step = 5;
            socket.write(`MAIL FROM:<${options.from}>\r\n`);
          } else if (step === 5 && code === 250) {
            step = 6;
            socket.write(`RCPT TO:<${options.to}>\r\n`);
          } else if (step === 6 && code === 250) {
            step = 7;
            socket.write('DATA\r\n');
          } else if (step === 7 && code === 354) {
            step = 8;
            const payload = options.rawMessage.endsWith('\r\n.\r\n')
              ? options.rawMessage
              : options.rawMessage.replace(/\r?\n\.\r?\n?$/, '') + '\r\n.\r\n';
            socket.write(payload);
          } else if (step === 8 && code === 250) {
            step = 9;
            socket.write('QUIT\r\n');
            resolve({
              accepted: true,
              response: line,
            });
          } else if (code === 221) {
            socket.end();
          } else if (code >= 400) {
            socket.end();
            reject(new Error(`SMTP error (${code}): ${line}`));
          }
        }
      });

      socket.on('error', (err) => reject(err));
    });
  }
}
