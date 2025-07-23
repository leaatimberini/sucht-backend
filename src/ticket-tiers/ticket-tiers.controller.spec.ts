import { Test, TestingModule } from '@nestjs/testing';
import { TicketTiersController } from './ticket-tiers.controller';

describe('TicketTiersController', () => {
  let controller: TicketTiersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketTiersController],
    }).compile();

    controller = module.get<TicketTiersController>(TicketTiersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
