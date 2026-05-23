import { Global, Module, type OnModuleDestroy } from '@nestjs/common';
import { closeQueues, getQueue } from './bullmq.client';
import { QUEUE_NAMES } from './queues';

@Global()
@Module({
  providers: [
    {
      provide: 'BULLMQ_QUEUES',
      useFactory: () => Object.values(QUEUE_NAMES).map((name) => getQueue(name)),
    },
  ],
  exports: ['BULLMQ_QUEUES'],
})
export class QueueModule implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await closeQueues();
  }
}
