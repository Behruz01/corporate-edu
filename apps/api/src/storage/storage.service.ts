import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadEnv } from '../config/env';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;
  private readonly publicBase: string;

  constructor() {
    const env = loadEnv();
    this.root = path.resolve(env.STORAGE_LOCAL_DIR);
    this.publicBase = env.STORAGE_PUBLIC_URL;
  }

  async ensureRoot(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async putBuffer(tenantId: string, originalName: string, data: Buffer): Promise<{ key: string; size: number }> {
    await this.ensureRoot();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'upload';
    const key = path.posix.join('tenant', tenantId, `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`);
    const abs = this.absolute(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
    return { key, size: data.byteLength };
  }

  absolute(key: string): string {
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep) && abs !== this.root) {
      throw new Error('Path escape detected');
    }
    return abs;
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async readBuffer(key: string): Promise<Buffer> {
    return fs.readFile(this.absolute(key));
  }

  streamFile(key: string): NodeJS.ReadableStream {
    return createReadStream(this.absolute(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.stat(this.absolute(key));
      return true;
    } catch {
      return false;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.absolute(key));
    } catch (error) {
      this.logger.warn(`remove failed for ${key}: ${(error as Error).message}`);
    }
  }
}
