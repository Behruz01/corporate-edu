import { Controller, Get, Query } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('who-knows')
export class WhoKnowsController {
  constructor(private readonly memory: MemoryService) {}

  @Get()
  search(@Query('query') query = ''): Promise<unknown> {
    return this.memory.whoKnows(query);
  }
}
