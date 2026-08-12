export const messageTemplateCategories = ["renewal", "collection", "welcome", "maintenance", "custom"] as const;
export type MessageTemplateCategory = (typeof messageTemplateCategories)[number];

export function normalizeMessageTemplate(input: { name: string; category: MessageTemplateCategory; content: string }) {
  const name = input.name.trim();
  const content = input.content.trim().replace(/\r\n/g, "\n");
  if (!name || !content) throw new Error("Nome e conteúdo do modelo são obrigatórios.");
  return { name, category: input.category, content };
}
