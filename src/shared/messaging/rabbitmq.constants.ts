// Extraído em arquivo próprio para quebrar a dependência circular entre
// rabbitmq.module.ts e event-publisher.service.ts (ambos importavam o token
// um do outro), que fazia RABBITMQ_CLIENT chegar `undefined` no decorator
// @Inject() em tempo de carregamento do módulo — erro só visível ao rodar
// `node dist/main` de verdade (não aparece em testes unitários isolados).
export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';
