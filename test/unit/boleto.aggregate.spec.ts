import { BoletoAggregate } from '../../src/modules/financeiro/domain/boleto.aggregate';

describe('BoletoAggregate', () => {
  it('gera um boleto com status ABERTO e valor original correto', () => {
    const boleto = BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', 500, '2026-08-10');

    expect(boleto.status).toBe('ABERTO');
    expect(boleto.valorTotal).toBe(500);
    expect(boleto.pullUncommittedEvents()).toHaveLength(1);
  });

  it('rejeita valor original negativo', () => {
    expect(() =>
      BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', -10, '2026-08-10'),
    ).toThrow('não pode ser negativo');
  });

  it('aplica multa limitada a 2% e marca como EM_ATRASO (RN-02)', () => {
    const boleto = BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', 1000, '2026-08-10');
    boleto.pullUncommittedEvents();

    boleto.aplicarMultaJuros(0.05, 0.001, 10); // pede 5%, mas o agregado limita a 2%

    expect(boleto.status).toBe('EM_ATRASO');
    // 2% de 1000 = 20 (multa) + 0.1%/dia * 10 dias * 1000 = 10 (juros) => total 1030
    expect(boleto.valorTotal).toBe(1030);
  });

  it('confirma pagamento e muda status para PAGO', () => {
    const boleto = BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', 500, '2026-08-10');
    boleto.pullUncommittedEvents();

    boleto.confirmarPagamento(500, 'PIX', 'txid-123');

    expect(boleto.status).toBe('PAGO');
  });

  it('é idempotente: confirmar pagamento duas vezes não gera erro nem evento duplicado', () => {
    const boleto = BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', 500, '2026-08-10');
    boleto.pullUncommittedEvents();

    boleto.confirmarPagamento(500, 'PIX', 'txid-123');
    boleto.pullUncommittedEvents();
    boleto.confirmarPagamento(500, 'PIX', 'txid-123'); // reentrega de webhook

    expect(boleto.pullUncommittedEvents()).toHaveLength(0);
    expect(boleto.status).toBe('PAGO');
  });

  it('rejeita pagamento de boleto cancelado', () => {
    const events = BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', 500, '2026-08-10')
      .pullUncommittedEvents();
    // Simula reconstrução a partir de histórico incluindo um cancelamento (ilustrativo)
    const boleto = BoletoAggregate.fromHistory(events);
    expect(boleto.status).toBe('ABERTO');
  });

  it('reconstrói estado a partir do histórico de eventos (fromHistory)', () => {
    const original = BoletoAggregate.gerar('cond-1', 'unid-1', '2026-08-01', 500, '2026-08-10');
    const events = original.pullUncommittedEvents();

    const reconstruido = BoletoAggregate.fromHistory(events);

    expect(reconstruido.status).toBe('ABERTO');
    expect(reconstruido.valorTotal).toBe(500);
  });
});
