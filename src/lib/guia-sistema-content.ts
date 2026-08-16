export type GuiaFormula = {
  title: string;
  expression: string;
  note?: string;
  example?: string;
};

export type GuiaTopic = {
  id: string;
  title: string;
  href?: string;
  summary: string;
  steps?: string[];
  formulas?: GuiaFormula[];
  tips?: string[];
};

export type GuiaGroup = {
  id: string;
  label: string;
  kicker: string;
  description: string;
  image: string;
  topics: GuiaTopic[];
};

export const GUIA_GROUPS: GuiaGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    kicker: "Dia a dia comercial",
    description:
      "Da chegada do lead até o acompanhamento na carteira. Aqui mora o atendimento.",
    image: "/guia/operacao.png",
    topics: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: "/dashboard",
        summary:
          "Painel do mês: entradas, funil, documentação, vendas, comissão e o que está parado. Admin e gerente veem o time; corretor vê a própria carteira.",
        steps: [
          "Abra o mês atual — os cards comparam com o mês anterior.",
          "Use os atalhos dos KPIs para ir ao módulo correspondente.",
          "Olhe “atenção”: leads sem dono e parados há alguns dias.",
        ],
        formulas: [
          {
            title: "Evolução vs. mês anterior",
            expression: "(atual − anterior) ÷ anterior × 100",
            note: "Se o mês anterior for 0: mostra 0% quando o atual também é 0; senão +100%.",
            example: "12 vendas agora e 8 no mês passado → +50%.",
          },
          {
            title: "Taxa de conversão (no dashboard)",
            expression: "vendas do mês ÷ documentações do mês × 100",
            note: "Venda = ficha de documentação com status 2 “Vendido”. Sem documentação no mês, a taxa fica zerada.",
          },
        ],
      },
      {
        id: "leads",
        title: "Leads",
        href: "/leads",
        summary:
          "Captação: quem ainda não é carteira. Entram por cadastro, importação, Meta Ads ou distribuição do pool.",
        steps: [
          "Chegaram = pool sem equipe e sem corretor (admin distribui).",
          "Cadastre ou importe a planilha. Origem, tags e CCA vêm de Configurações.",
          "Atribua a um corretor ou deixe no pool da equipe do gerente.",
          "Quando vira atendimento contínuo, converta para Cliente (carteira).",
        ],
        tips: [
          "Lead = captação. Cliente = carteira pessoal do corretor. São listas e funis separados.",
          "Sem equipe = fica no pool do admin. Para pool de equipe, escolha o gerente e a opção de pool.",
        ],
      },
      {
        id: "funil",
        title: "Funil",
        href: "/funil",
        summary:
          "Kanban dos leads. As colunas são as etapas do funil ativo, com papéis (inicial, análise, venda, perdido).",
        steps: [
          "Arraste o card entre etapas. O funil e as cores se definem em Configurações → Funis.",
          "Etapa com papel Análise dispara o fluxo de documentação/análise.",
          "Etapa Perdido pede motivo (catálogo de motivos de perda).",
          "Abra o card para triagem, proposta, imóvel de interesse e dono.",
        ],
        tips: [
          "Papéis da etapa: Inicial (entrada), Análise, Venda, Perdido — o restante é intermediário.",
        ],
      },
      {
        id: "triagem",
        title: "Triagem",
        href: "/triagem",
        summary:
          "Primeiro contato registrado: o que foi falado, origem do atendimento e para quem segue.",
        steps: [
          "Abra a triagem a partir do lead/funil ou pela lista.",
          "Anote o texto (resumo curto) e a origem do contato.",
          "O histórico fica no lead — não substitui a ficha de documentação.",
        ],
      },
      {
        id: "agenda",
        title: "Agenda",
        href: "/agenda",
        summary:
          "Compromissos pessoais e compartilhados. O sino avisa o que está perto (hoje, 2h, 1h).",
        steps: [
          "Crie visita, ligação ou lembrete e vincule ao contato se quiser.",
          "Itens compartilhados aparecem para a equipe; os pessoais só para você.",
          "Conclua o compromisso para sair da lista de pendentes do dia.",
        ],
      },
      {
        id: "clientes",
        title: "Clientes",
        href: "/clientes",
        summary:
          "Carteira: contatos já assumidos pelo corretor. Mesma ficha do lead, outro tipo.",
        steps: [
          "Trabalhe a lista ou o Funil de Clientes — o recorte é só tipo “cliente”.",
          "Corretor e treinee veem a própria carteira; gestão vê o time.",
        ],
      },
      {
        id: "funil-clientes",
        title: "Funil de Clientes",
        href: "/funil-clientes",
        summary:
          "O mesmo kanban do Funil, filtrado na carteira. Etapas e papéis são os do funil ativo.",
        steps: [
          "Use para nutrir quem já é cliente, sem misturar com captação.",
          "Perda aqui vai para Perda de cliente, não para Leads perdidos.",
        ],
      },
      {
        id: "leads-perdidos",
        title: "Leads Perdidos",
        href: "/leads-perdidos",
        summary:
          "Leads que saíram no funil com motivo de perda. Serve para revisar origem e motivo.",
        tips: [
          "Motivos são cadastrados em Configurações. O dashboard agrupa perdas do mês por motivo.",
        ],
      },
      {
        id: "clientes-perdidos",
        title: "Perda de cliente",
        href: "/clientes-perdidos",
        summary:
          "Clientes da carteira marcados como perdidos — separado da captação.",
      },
      {
        id: "treinamento",
        title: "Treinamento",
        href: "/treinamento",
        summary:
          "Biblioteca da imobiliária: seções, subseções e links (vídeos, PDFs, aulas). Cada tenant monta a própria.",
        steps: [
          "Admin, gerente, analista e treinee podem criar seções e links.",
          "Organize por pasta (até 4 níveis) e cole a URL do material.",
        ],
      },
    ],
  },
  {
    id: "fechamento",
    label: "Fechamento",
    kicker: "Do processo à venda",
    description:
      "Documentação, proposta, contrato e o registro do que de fato vendeu.",
    image: "/guia/fechamento.png",
    topics: [
      {
        id: "documentacao",
        title: "Documentação",
        href: "/documentacao",
        summary:
          "Ficha do processo: construtora, empreendimento, VGV, corretor e dois status independentes.",
        steps: [
          "Status 1 = parecer de crédito/análise (pré-análise, em análise, aprovado, reprovado).",
          "Status 2 = andamento da venda (andamento, Bacen, vendido).",
          "O analista trabalha a fila em Análise; o comercial acompanha aqui.",
          "Quando Status 2 vira Vendido, a ficha entra em Vendas e alimenta ranking, meta e taxa.",
        ],
        formulas: [
          {
            title: "O que conta como venda",
            expression: "documentação com Status 2 no grupo “Vendido”",
            note: "O sistema reconhece variantes: Vendido, vendida, venda etc. VGV da ficha entra no ranking e nas metas de VGV.",
          },
        ],
        tips: [
          "Status 1 “Aprovado c/ restrição” ainda conta como aprovado nos cards.",
          "Fontes e rótulos de status se editam em Configurações.",
        ],
      },
      {
        id: "propostas",
        title: "Propostas",
        href: "/propostas",
        summary:
          "Simulação comercial em PDF: valor do imóvel, desconto e composição (sinal, parcelas, FGTS, financiamento…).",
        steps: [
          "Vincule cliente/lead, construtora e empreendimento.",
          "Preencha valor, desconto e as linhas da composição.",
          "A diferença precisa fechar: líquido = soma da composição.",
          "Gere o PDF com a identidade da imobiliária e envie.",
        ],
        formulas: [
          {
            title: "Valor líquido",
            expression: "valor do imóvel − desconto",
            example: "R$ 420.000 − R$ 20.000 = R$ 400.000",
          },
          {
            title: "Composição",
            expression:
              "sinal + apartado + pré-chaves + pós-chaves + intercaladas + FGTS + Mora Bem + MCMV + financiamento",
            note: "Parcela Caixa é só informativa — não entra na soma.",
          },
          {
            title: "Diferença (precisa ser zero)",
            expression: "valor líquido − composição",
          },
        ],
      },
      {
        id: "contratos",
        title: "Contratos",
        href: "/contratos",
        summary:
          "Gera PDF de intermediação (e outros modelos) com dados do contratante, imóvel e valores por extenso.",
        steps: [
          "Escolha o modelo, preencha os blocos e baixe o PDF.",
          "A cor e a logo seguem a identidade da imobiliária.",
        ],
      },
      {
        id: "vendas",
        title: "Vendas",
        href: "/vendas",
        summary:
          "Lista das documentações vendidas no período — não é um cadastro à parte.",
        steps: [
          "Filtre por mês, equipe e corretor.",
          "O VGV somado aqui é o mesmo que alimenta dashboard, ranking e metas de VGV.",
        ],
        formulas: [
          {
            title: "VGV do período",
            expression: "soma do VGV das fichas vendidas no recorte",
          },
        ],
      },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    kicker: "Consulta na hora de atender",
    description:
      "Construtoras, empreendimentos e unidades para montar proposta e documentação.",
    image: "/guia/catalogo.png",
    topics: [
      {
        id: "construtoras",
        title: "Construtoras",
        href: "/construtoras",
        summary:
          "Cadastro da construtora, cor no sistema, empreendimentos e (quando houver) ranking de vendas por parceira.",
        steps: [
          "Crie a construtora e os empreendimentos (cidade, tipo, status, tags).",
          "Tipos e status de empreendimento vêm de Configurações.",
        ],
      },
      {
        id: "imoveis",
        title: "Imóveis",
        href: "/imoveis",
        summary:
          "Unidades do catálogo para consulta no atendimento. Pode ser oculto do menu em Configurações.",
        tips: [
          "Se o time não usa tabela de unidades, oculte Imóveis no menu — Construtoras continua disponível.",
        ],
      },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    kicker: "Time, resultado e ajustes",
    description:
      "Quem vende, quanto converte, metas e a configuração que sustenta o comercial.",
    image: "/guia/gestao.png",
    topics: [
      {
        id: "ranking",
        title: "Ranking",
        href: "/corretores",
        summary:
          "Comparativo de corretores (e gerentes, para o admin): vendas, VGV, documentações e progresso da meta.",
        formulas: [
          {
            title: "Posição",
            expression: "ordenação por vendas / VGV / documentações no mês",
            note: "Só gestão vê ranking e VGV. Corretor não acessa esta tela.",
          },
        ],
      },
      {
        id: "metas",
        title: "Metas",
        href: "/metas",
        summary:
          "Alvo de vendas, documentações ou VGV — por corretor, gerente/equipe ou imobiliária, em vários períodos.",
        steps: [
          "Admin define meta da imobiliária, de gerente ou de corretor.",
          "Gerente define para a própria equipe. Corretor vê (e pode ter pessoal).",
          "O “atual” sobe sozinho conforme vendas/docs/VGV no período da meta.",
        ],
        formulas: [
          {
            title: "Progresso",
            expression: "realizado no período ÷ valor da meta × 100",
            example: "8 vendas / meta 10 → 80%.",
          },
        ],
      },
      {
        id: "analise",
        title: "Análise",
        href: "/resultado",
        summary:
          "Fila do analista: assumir ficha, parecer, aprovar ou reprovar. O comercial é avisado no resultado.",
        steps: [
          "Analista assume o processo e registra o parecer.",
          "Aprovado/reprovado reflete no Status 1 da documentação.",
          "Gerente recebe aviso em tela quando o resultado chega.",
        ],
      },
      {
        id: "taxa-conversao",
        title: "Taxa de conversão",
        href: "/taxa-conversao",
        summary:
          "Mesma regra do dashboard, detalhada por corretor e equipe — para ver quem transforma documentação em venda.",
        formulas: [
          {
            title: "Taxa do corretor no mês",
            expression: "vendas ÷ documentações × 100",
            note: "Documentação = ficha criada no mês. Venda = ficha vendida no mês. Não é lead → venda.",
            example: "10 fichas e 4 vendas → 40%.",
          },
        ],
        tips: [
          "Uma taxa alta com poucas fichas não é o mesmo que volume. Olhe vendas e VGV juntos.",
        ],
      },
      {
        id: "equipes",
        title: "Equipes",
        href: "/equipes",
        summary:
          "Time com um gerente. Leads no pool da equipe e o recorte do gerente saem daqui.",
        steps: [
          "Crie a equipe, defina o gerente e encaixe os corretores.",
          "Um gerente enxerga a operação da própria equipe.",
        ],
      },
      {
        id: "usuarios",
        title: "Usuários",
        href: "/usuarios",
        summary:
          "Contas e papéis: admin, gerente, corretor, analista, treinee. O plano limita a quantidade.",
        tips: [
          "Bronze: CRM operacional. Prata: administrativo ou financeiro. Ouro: tudo. Analista não entra no Bronze.",
        ],
      },
      {
        id: "configuracoes",
        title: "Configurações",
        href: "/configuracoes",
        summary:
          "Identidade, funis, origens, tags, motivos, CCAs, status de documentação e preferências de menu/financeiro.",
        steps: [
          "Empresa: nome, logo e cor — entram em PDF de proposta e contrato.",
          "Funis: etapas, cores e papéis (inicial / análise / venda / perdido).",
          "Catálogos: origens, tags, motivos de perda, CCAs, status 1 e 2.",
        ],
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    kicker: "Caixa da imobiliária",
    description:
      "Movimentos, títulos, fluxo e o rateio de comissão sobre o VGV. Admin vê o caixa; corretor/gerente veem a comissão do papel deles.",
    image: "/guia/financeiro.png",
    topics: [
      {
        id: "fin-visao",
        title: "Visão geral",
        href: "/financeiro/visao-geral",
        summary:
          "Saldo, receitas, despesas, a receber, a pagar e resultado do período.",
        formulas: [
          {
            title: "Resultado do mês",
            expression: "receitas − despesas",
          },
        ],
      },
      {
        id: "fin-parceiros",
        title: "Clientes e fornecedores",
        href: "/financeiro/clientes-fornecedores",
        summary:
          "Cadastro de quem paga e de quem recebe. Usado nos títulos e na movimentação.",
      },
      {
        id: "fin-mov",
        title: "Movimentação financeira",
        href: "/financeiro/movimentacao",
        summary:
          "Lançamentos de entrada e saída já realizados (caixa de fato).",
        tips: [
          "Título a receber/pagar só vira movimento quando é baixado (recebido/pago).",
        ],
      },
      {
        id: "fin-fluxo",
        title: "Fluxo de caixa",
        href: "/financeiro/fluxo-caixa",
        summary:
          "Projeção por data de vencimento: o que entra, o que sai e o saldo no período (dia/semana/mês).",
        formulas: [
          {
            title: "Saldo do bucket",
            expression: "saldo anterior + entradas − saídas do intervalo",
          },
        ],
      },
      {
        id: "fin-receber",
        title: "Contas a receber",
        href: "/financeiro/contas-a-receber",
        summary:
          "Títulos de entrada (comissões a receber da construtora, etc.). Baixa gera o movimento.",
      },
      {
        id: "fin-pagar",
        title: "Contas a pagar",
        href: "/financeiro/contas-a-pagar",
        summary: "Títulos de saída. Mesma lógica de vencimento, baixa e centro.",
      },
      {
        id: "fin-despesas",
        title: "Despesas",
        href: "/financeiro/despesas",
        summary:
          "Saídas classificadas por tipo/centro — alimenta os gráficos da visão geral.",
      },
      {
        id: "fin-comissao",
        title: "Comissão",
        href: "/financeiro/comissao",
        summary:
          "Rateio em cima do VGV da venda: bruta da imobiliária, tributos, líquida e split (corretor, gerente, caixa, sócios).",
        steps: [
          "Informe o VGV e os percentuais. O split da líquida precisa somar 100%.",
          "Status: pendente → liberada → paga (o dashboard usa esses totais).",
          "Corretor vê a fatia dele; gerente a da equipe; admin o consolidado.",
        ],
        formulas: [
          {
            title: "Comissão bruta",
            expression: "VGV × % da imobiliária",
            example: "R$ 400.000 × 5% = R$ 20.000",
          },
          {
            title: "Tributos",
            expression: "comissão bruta × % de tributos",
            example: "R$ 20.000 × 14,5% = R$ 2.900",
          },
          {
            title: "Comissão líquida",
            expression: "comissão bruta − tributos",
            example: "R$ 20.000 − R$ 2.900 = R$ 17.100",
          },
          {
            title: "Split da líquida",
            expression:
              "líquida × % corretor | gerente | caixa | sócios  (os 4 somam 100%)",
            note: "O valor dos sócios absorve o centavo de arredondamento.",
            example: "50% corretor de R$ 17.100 = R$ 8.550",
          },
        ],
      },
    ],
  },
  {
    id: "conta",
    label: "Conta",
    kicker: "Você no sistema",
    description: "Dados pessoais, senha e preferências da sessão.",
    image: "/guia/hero.png",
    topics: [
      {
        id: "perfil",
        title: "Perfil",
        href: "/perfil",
        summary:
          "Nome, contato e senha. A home inicial da imobiliária (se configurada) respeita o que o seu papel pode abrir.",
      },
    ],
  },
];

export const GUIA_JOURNEY = [
  { n: "1", title: "Chegou", text: "Lead entra no pool ou já com dono." },
  { n: "2", title: "Atende", text: "Funil, triagem e agenda." },
  { n: "3", title: "Analisa", text: "Documentação + parecer do analista." },
  { n: "4", title: "Propõe", text: "Proposta fecha a composição." },
  { n: "5", title: "Vende", text: "Status 2 Vendido → ranking, meta, comissão." },
] as const;
