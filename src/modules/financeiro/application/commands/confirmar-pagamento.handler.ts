import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmarPagamentoCommand } from './confirmar-pagamento.command';
import { BoletoEventStoreRepository } from '../../infrastructure/persistence/boleto-event-store.repository';

// Idempotente por natureza: o agregado ignora confirmação repetida (ver
// BoletoAggregate.confirmarPagamento), protegendo contra reentrega de webhook
// do gateway de pagamento (Pix/boleto) — mesmo princípio de
// financeiro.sp_confirmar_pagamento no banco (defesa em profundidade).
@CommandHandler(ConfirmarPagamentoCommand)
export class ConfirmarPagamentoHandler implements ICommandHandler<ConfirmarPagamentoCommand> {
  constructor(private readonly eventStore: BoletoEventStoreRepository) {}

  async execute(command: ConfirmarPagamentoCommand): Promise<void> {
    const boleto = await this.eventStore.loadById(command.boletoId);
    if (!boleto) throw new NotFoundException('Boleto não encontrado');

    boleto.confirmarPagamento(command.valorPago, command.metodo, command.referenciaExterna);
    await this.eventStore.save(boleto);
  }
}
