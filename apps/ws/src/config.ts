import "./env";
export const JWT_PASSWORD = process.env.JWT_PASSWORD;
export const PORT = process.env.WS_PORT ?? process.env.PORT ?? 8081;
