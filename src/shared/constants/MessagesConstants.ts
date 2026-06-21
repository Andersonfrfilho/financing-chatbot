export const MessagesConstants = {
  // Saudação
  GREETING: `Olá! 👋 Seja bem-vindo(a) à nossa assessoria de crédito!

Sou seu assistente virtual e vou te ajudar a encontrar as *melhores opções de financiamento* do mercado.

Em qual modalidade você precisa de crédito?`,

  FINANCING_TYPE_OPTIONS: `Escolha uma opção:

1️⃣ Financiamento Imobiliário (casa/apartamento)
2️⃣ Financiamento de Veículo (carro/moto)
3️⃣ Empréstimo Pessoal
4️⃣ Crédito Consignado
5️⃣ Crédito para Empresa (PJ)
6️⃣ Financiamento de Equipamentos
7️⃣ Crédito Rural

Responda com o número da opção desejada.`,

  // Dados pessoais
  ASK_NAME: 'Para começar, qual é o seu *nome completo*?',
  ASK_CPF: 'Agora preciso do seu *CPF* (apenas números):',
  ASK_BIRTH_DATE: 'Qual sua *data de nascimento*? (DD/MM/AAAA)',
  ASK_CIVIL_STATUS: `Qual seu *estado civil*?

1️⃣ Solteiro(a)
2️⃣ Casado(a)
3️⃣ Divorciado(a)
4️⃣ Viúvo(a)
5️⃣ União Estável`,
  ASK_EMAIL: 'Qual seu *e-mail* para contato?',
  ASK_CITY: 'Em qual *cidade* você mora?',
  ASK_STATE: 'Em qual *estado* (sigla, ex: SP, RJ, MG)?',

  // Dados financeiros
  ASK_MONTHLY_INCOME: 'Qual é a sua *renda mensal bruta*? (ex: 5000)',
  ASK_FAMILY_INCOME: 'Qual é a *renda familiar total* (somando todos os membros)? (ex: 8000)',

  // Imobiliário
  ASK_HAS_FGTS: 'Você possui *saldo no FGTS* para usar na entrada?\n\n1️⃣ Sim\n2️⃣ Não',
  ASK_FGTS_AMOUNT: 'Qual o *valor disponível do FGTS*? (ex: 15000)',
  ASK_HAS_DOWN_PAYMENT: 'Você possui *valor para entrada*?\n\n1️⃣ Sim\n2️⃣ Não',
  ASK_DOWN_PAYMENT: 'Qual o *valor de entrada disponível*? (ex: 30000)',
  ASK_PROPERTY_VALUE: 'Qual o *valor do imóvel*? (ex: 350000)',
  ASK_PROPERTY_TYPE: `Qual o *tipo do imóvel*?

1️⃣ Residencial (casa/apartamento)
2️⃣ Comercial
3️⃣ Terreno
4️⃣ Rural`,
  ASK_PROPERTY_CITY: 'Em qual *cidade fica o imóvel*?',
  ASK_PROPERTY_STATE: 'Em qual *estado fica o imóvel*? (sigla, ex: SP)',

  // Veículo
  ASK_VEHICLE_TYPE: `Qual o *tipo de veículo*?

1️⃣ Carro / Caminhonete
2️⃣ Moto
3️⃣ Caminhão / Utilitário
4️⃣ Outro`,
  ASK_VEHICLE_VALUE: 'Qual o *valor do veículo*? (ex: 80000)',
  ASK_VEHICLE_YEAR: 'Qual o *ano do veículo*? (ex: 2022)',
  ASK_VEHICLE_DOWN_PAYMENT: 'Qual o *valor de entrada*? (ex: 20000 ou 0 para sem entrada)',

  // Pessoal / Consignado
  ASK_LOAN_AMOUNT: 'Qual o *valor que precisa emprestado*? (ex: 15000)',
  ASK_EMPLOYMENT_TYPE: `Qual o seu *vínculo empregatício*?

1️⃣ CLT (funcionário privado)
2️⃣ Servidor público
3️⃣ Aposentado / Pensionista INSS
4️⃣ Autônomo / MEI
5️⃣ Empresário`,
  ASK_EMPLOYER: 'Qual o *nome do seu empregador/órgão*?',

  // Empresa
  ASK_CNPJ: 'Qual o *CNPJ da empresa*? (apenas números)',
  ASK_COMPANY_REVENUE: 'Qual o *faturamento mensal* da empresa? (ex: 50000)',
  ASK_LOAN_PURPOSE: 'Para qual *finalidade* é o crédito? (ex: capital de giro, compra de equipamento)',

  // Prazo
  ASK_TERM: (min: number, max: number) =>
    `Em quantas *parcelas* deseja pagar?\n\nMínimo: ${min} | Máximo: ${max} parcelas\n\nOu escolha:\n1️⃣ 12x\n2️⃣ 24x\n3️⃣ 36x\n4️⃣ 48x\n5️⃣ 60x\n6️⃣ Outro (informe o número)`,

  // Validações
  INVALID_CPF: '❌ CPF inválido. Por favor, informe apenas os 11 números do CPF:',
  INVALID_DATE: '❌ Data inválida. Use o formato DD/MM/AAAA (ex: 15/03/1985):',
  INVALID_NUMBER: '❌ Por favor, informe apenas o *valor em números* (ex: 350000):',
  INVALID_STATE: '❌ Estado inválido. Use a sigla com 2 letras (ex: SP, RJ, MG):',
  INVALID_OPTION: '❌ Opção inválida. Por favor, escolha um número da lista:',
  INVALID_EMAIL: '❌ E-mail inválido. Por favor, informe um e-mail válido:',

  // Retomada
  RESUME_SESSION: (name: string) =>
    `Olá, *${name}*! 👋 Vi que você tinha uma conversa em andamento.\n\nDeseja *continuar* de onde parou ou *começar uma nova* simulação?\n\n1️⃣ Continuar\n2️⃣ Nova simulação`,

  // Handoff
  HUMAN_HANDOFF: `Vou conectar você com um de nossos especialistas agora. 🧑‍💼\n\nEm instantes, alguém da equipe entrará em contato!\n\n*Horário de atendimento:* Segunda a Sexta, 8h às 18h`,

  // Conclusão
  SIMULATION_INTRO: (name: string, banks: number) =>
    `✅ Simulação concluída, *${name}*!\n\nComparei *${banks} bancos* para você. Confira as opções:`,

  BANK_RESULT: (params: {
    bankName: string
    rateAnnual: number
    sacFirst: number
    sacLast: number
    priceInstallment: number
    totalCost: number
    modality: string
  }) =>
    `🏦 *${params.bankName}*\n` +
    `Modalidade: ${params.modality} | Taxa: ${(params.rateAnnual * 100).toFixed(2)}% a.a.\n\n` +
    `📊 *SAC* (parcelas decrescentes)\n` +
    `  1ª parcela: R$ ${params.sacFirst.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `  Última: R$ ${params.sacLast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
    `📊 *PRICE* (parcela fixa)\n` +
    `  Parcela: R$ ${params.priceInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
    `💰 Custo total: R$ ${params.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,

  SIMULATION_FOOTER: `\n\n💬 Quer falar com um especialista sobre alguma dessas opções?\n\n1️⃣ Sim, quero ser atendido\n2️⃣ Não, obrigado`,

  // Cancelamento
  CANCEL_FLOW: 'Tudo bem! Se quiser fazer uma nova simulação, é só enviar "oi" 😊',
  RESTART_FLOW: 'Vou reiniciar sua simulação. Qual tipo de financiamento você precisa?',
}
