# src/marketing/

Páginas e componentes de **marketing** — área pública, fora da aplicação autenticada.

## O que é esta pasta

Contém landing pages, páginas institucionais, SEO e qualquer conteúdo voltado a visitantes que ainda não usam a plataforma. Separada de `core/` (plataforma) e `products/` (SaaS autenticado).

## Estrutura

```
marketing/
├── components/     → Seções reutilizáveis de landing (Hero, FAQ, Pricing…)
└── pages/          → Páginas completas (LeadingPage, AboutPage…)
```

## O que deve ter aqui

| Tipo                                 | Exemplos                                            |
| ------------------------------------ | --------------------------------------------------- |
| **Landing pages**                    | Página inicial, página de produto, captura de leads |
| **Seções de marketing**              | Hero, depoimentos, planos, CTA, footer              |
| **Páginas institucionais**           | Sobre, contato, termos, privacidade                 |
| **Componentes visuais de conversão** | Banner promocional, formulário de newsletter        |

## O que **não** colocar aqui

| Tipo                         | Onde colocar            |
| ---------------------------- | ----------------------- |
| Login, dashboard, CRM        | `core/` ou `products/`  |
| Button, Input genéricos      | `shared/components/ui/` |
| Lógica de autenticação       | `core/auth/`            |
| Regras de negócio de produto | `products/`             |

## Convenções

- Rotas públicas de marketing devem ser registradas em `core/router/routes.tsx`
- Prefira componentes em `marketing/components/` quando a seção for reutilizada entre páginas
- Use assets de `public/` para imagens com URL fixa (OG tags) e `src/assets/` para imagens importadas na UI

## Páginas atuais

| Página            | Rota (quando configurada) |
| ----------------- | ------------------------- |
| `LeadingPage.tsx` | Landing page principal    |
