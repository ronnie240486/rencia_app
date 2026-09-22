export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Pasta pra guardar imagens/APKs enviados pelo painel (logo, banner, fundo,
  // etc.) fora do Forge. Sem essa variável apontando pra um Volume do
  // Railway, esses arquivos ficam no disco do próprio container — que é
  // apagado a cada deploy, fazendo a imagem "sumir" até alguém subir de
  // novo. Ver server/storage.ts.
  uploadsDir: process.env.UPLOADS_DIR ?? "",
  // Alternativa ao Volume do Railway (nem todo plano/serviço oferece Volume):
  // conta gratuita no Cloudinary guarda as imagens fora do container, então
  // elas nunca são apagadas por um deploy. Ver server/storage.ts.
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
};
