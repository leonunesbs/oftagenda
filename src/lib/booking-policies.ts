export type BookingPolicySection = {
  id: string;
  label: string;
  title: string;
  description: string;
  points: string[];
};

export type BookingLegalReference = {
  label: string;
  text: string;
};

export const bookingPolicySections: BookingPolicySection[] = [
  {
    id: "reserva",
    label: "Política 01",
    title: "Reservas",
    description:
      "A taxa de reserva confirma a intenção de ocupar o horário selecionado.",
    points: [
      "A taxa de reserva funciona como sinal para confirmação do horário.",
      "No comparecimento à consulta, a taxa é abatida no valor total do atendimento.",
      "Após no-show, é necessário iniciar uma nova reserva do zero.",
    ],
  },
  {
    id: "cancelamento",
    label: "Política 02",
    title: "Cancelamentos",
    description:
      "Os cancelamentos seguem uma janela de antecedência para processamento automático.",
    points: [
      "Cancelamentos automáticos são permitidos até 24 horas antes do horário agendado.",
      "Com menos de 24 horas, o cancelamento pelo app fica indisponível e segue via WhatsApp.",
      "No-show cancela automaticamente a reserva por ausência.",
    ],
  },
  {
    id: "reembolso",
    label: "Política 03",
    title: "Reembolsos",
    description:
      "A devolução da taxa de reserva depende do momento e do cenário de cancelamento.",
    points: [
      "Cancelamentos com mais de 24 horas de antecedência têm reembolso integral da taxa.",
      "Cancelamentos com menos de 24 horas não têm reembolso automático.",
      "Em caso de no-show, a taxa de reserva é retida.",
    ],
  },
  {
    id: "reagendamento",
    label: "Política 04",
    title: "Reagendamentos",
    description:
      "As regras de remarcação preservam previsibilidade de agenda e disponibilidade.",
    points: [
      "Você tem direito a 1 reagendamento sem custo.",
      "A partir do segundo reagendamento, é cobrada nova taxa de reserva, sem abatimento.",
      "Com menos de 24 horas, o reagendamento automático no app fica indisponível.",
    ],
  },
  {
    id: "dados",
    label: "Política 05",
    title: "Proteção de dados e privacidade",
    description:
      "Seguimos os princípios da LGPD e as diretrizes do CFM para coleta mínima de dados no agendamento.",
    points: [
      "Durante o agendamento, coletamos apenas dados essenciais: nome, contato e horário escolhido.",
      "Nenhum dado clínico ou de saúde é solicitado no momento da reserva — somente durante a consulta.",
      "A coleta mínima atende ao princípio de minimização da LGPD (Lei 13.709/2018, art. 6º, III).",
      "Seus dados pessoais são protegidos por criptografia e acesso restrito.",
    ],
  },
  {
    id: "modelo",
    label: "Política 06",
    title: "Modelo de agendamento",
    description:
      "O agendamento digital funciona como ferramenta administrativa, sem substituir a consulta médica.",
    points: [
      "O sistema de agendamento é classificado como baixo risco pela Resolução CFM 2.454/2026, por se tratar de aplicação administrativa sem impacto em decisões clínicas.",
      "Você escolhe local, data e horário — sem necessidade de informar queixa ou histórico médico.",
      "Informações clínicas complementares podem ser fornecidas de forma opcional após a reserva, na página de detalhes.",
      "A decisão sobre qualquer conduta médica permanece exclusivamente com o profissional de saúde, conforme o Código de Ética Médica.",
    ],
  },
  {
    id: "direitos",
    label: "Política 07",
    title: "Seus direitos",
    description:
      "Você tem direitos garantidos pela LGPD e pelo CFM sobre seus dados e seu atendimento.",
    points: [
      "Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais a qualquer momento.",
      "Você pode revogar consentimentos previamente concedidos, sem prejuízo ao atendimento.",
      "O uso de qualquer tecnologia de apoio no atendimento será sempre informado de forma clara e transparente.",
      "Para exercer seus direitos ou esclarecer dúvidas, entre em contato pelo WhatsApp disponível no site.",
    ],
  },
];

export const bookingLegalReferences: BookingLegalReference[] = [
  {
    label: "LGPD",
    text: "Lei 13.709/2018 — Lei Geral de Proteção de Dados Pessoais",
  },
  {
    label: "CFM 2.314/2022",
    text: "Regulamentação da telemedicina no Brasil",
  },
  {
    label: "CFM 2.454/2026",
    text: "Normatização do uso de IA na medicina — sistemas de agendamento como baixo risco",
  },
];
