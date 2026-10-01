import { EventEmitter } from 'events';
import http from 'http';
import { Socket } from 'net';

export interface TestResponse {
  status: number;
  body: any;
  headers: Record<string, any>;
}

export function createTestClient(app: any) {
  const request = (method: string, url: string, data?: any) => {
    return new Promise<TestResponse>((resolve, reject) => {
      // Create a mock socket
      const socket = new Socket();
      Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
      Object.defineProperty(socket, 'encrypted', { value: false });
      
      const req = new http.IncomingMessage(socket);
      req.method = method.toUpperCase();
      req.url = url;
      
      let payload = '';
      if (data !== undefined) {
        payload = typeof data === 'string' ? data : JSON.stringify(data);
        req.headers['content-type'] = 'application/json';
        req.headers['content-length'] = String(Buffer.byteLength(payload));
      }

      const res = new http.ServerResponse(req);
      // Attach mock socket methods to prevent uncaught exceptions in ServerResponse
      (res as any).connection = socket;
      (res as any).socket = socket;

      let responseBody = '';
      
      // Hook into response writes
      const origWrite = res.write.bind(res);
      const origEnd = res.end.bind(res);

      res.write = function (chunk: any, ...args: any[]): boolean {
        if (chunk) {
          responseBody += Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk;
        }
        return true;
      };

      res.end = function (chunk: any, ...args: any[]): any {
        if (chunk && typeof chunk !== 'function') {
          responseBody += Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk;
        }

        let parsed = responseBody;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          // keep as string
        }

        resolve({
          status: res.statusCode,
          body: parsed,
          headers: res.getHeaders(),
        });
        return res;
      };

      try {
        app(req, res);

        if (payload) {
          req.push(payload);
        }
        req.push(null);
      } catch (err) {
        reject(err);
      }
    });
  };

  return {
    get: (url: string) => request('GET', url),
    post: (url: string, body?: any) => request('POST', url, body),
    put: (url: string, body?: any) => request('PUT', url, body),
    delete: (url: string) => request('DELETE', url),
  };
}
