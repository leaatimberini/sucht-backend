import { Test, TestingModule } from '@nestjs/testing';
import { TicketTiersService } from './ticket-tiers.service';

describe('TicketTiersService', () => {
  let service: TicketTiersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketTiersService],
    }).compile();

    service = module.get<TicketTiersService>(TicketTiersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
