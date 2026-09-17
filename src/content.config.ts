/**
 * Coleções de conteúdo.
 *
 * O blog usa a camada de conteúdo do Astro com validação Zod no frontmatter.
 * Isso não é burocracia: cada campo obrigatório aqui é um campo que NUNCA
 * vai faltar numa página publicada. `description` ausente vira meta
 * description vazia; `pubDate` ausente quebra o schema Article. Com a
 * validação, o build FALHA em vez de publicar uma página defeituosa.
 *
 * É a diferença entre descobrir o erro em dez segundos no terminal e
 * descobrir três meses depois no Search Console.
 */

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    /** Vira o H1 e o title. Até 60 caracteres para não ser cortado na SERP. */
    title: z.string().min(10).max(80),

    /** Meta description. A faixa 120–160 é o que o Google costuma exibir. */
    description: z.string().min(80).max(180),

    /** Data de publicação. Coerce aceita a data crua do YAML. */
    pubDate: z.coerce.date(),

    /** Preenchida em revisão de conteúdo — sinal de frescor para o Google. */
    updatedDate: z.coerce.date().optional(),

    /** Autor. Padrão na organização, já que o conteúdo é institucional. */
    author: z.string().default('Equipe NivoTech'),

    /**
     * Imagem de capa e de compartilhamento.
     * O alt é obrigatório junto da imagem: `refine` impede publicar uma
     * imagem sem texto alternativo, que é falha de acessibilidade.
     */
    image: z
      .object({
        src: z.string(),
        alt: z.string().min(5),
      })
      .optional(),

    /** Categoria única — mantém a taxonomia simples e sem sobreposição. */
    category: z.enum(['Performance', 'SEO', 'Conversão', 'Design', 'Negócio']),

    /** Palavras-chave que o texto realmente cobre. Entra no schema Article. */
    keywords: z.array(z.string()).default([]),

    /** Tira do índice sem apagar o arquivo. */
    draft: z.boolean().default(false),

    /** Destaque na listagem do blog. */
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };
