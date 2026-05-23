import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ controllers: [AppController] }).compile();
    controller = module.get(AppController);
  });

  it('GET /ping → { ok: true }', () => {
    expect(controller.ping()).toEqual({ ok: true });
  });
});
