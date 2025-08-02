// backend/src/tickets/enums/ticket-status.enum.ts

export enum TicketStatus {
  VALID = 'valid',
  USED = 'used',
  INVALIDATED = 'invalidated',
  PARTIALLY_USED = 'partially_used',
  PARTIALLY_PAID = 'partially_paid',
  
  // CORRECCIÓN: Añadimos el nuevo estado para el ticket canjeado
  REDEEMED = 'redeemed',
}