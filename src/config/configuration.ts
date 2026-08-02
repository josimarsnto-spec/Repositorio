export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  googleOAuth: {
    // passport-oauth2 lança exceção no bootstrap se clientID/clientSecret vierem
    // vazios — como o login social é opcional (US é só um "nice to have" de SSO),
    // usamos um placeholder não-vazio para não derrubar a aplicação inteira
    // quando essas credenciais ainda não foram contratadas/configuradas.
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? 'not-configured',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? 'not-configured',
    callbackUrl: process.env.GOOGLE_OAUTH_CALLBACK_URL ?? 'http://localhost:3000/api/v1/auth/google/callback',
  },
});
