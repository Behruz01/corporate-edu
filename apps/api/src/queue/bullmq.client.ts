import { Queue, Worker, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { loadEnv } from '../config/env';
import type { QueueName } from './queues';

let connection: IORedis | undefined;

export function getConnection(): IORedis {
  if (!connection) {
    const env = loadEnv();
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
};

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getConnection(), defaultJobOptions });
    queues.set(name, queue);
  }
  return queue;
}

export type WorkerProcessor<T> = (data: T, jobId: string) => Promise<void>;

export function startWorker<T>(name: QueueName, processor: WorkerProcessor<T>): Worker<T> {
  return new Worker<T>(
    name,
    async (job) => processor(job.data as T, job.id ?? 'unknown'),
    { connection: getConnection(), concurrency: 2 },
  );
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
  await connection?.quit();
  connection = undefined;
}
