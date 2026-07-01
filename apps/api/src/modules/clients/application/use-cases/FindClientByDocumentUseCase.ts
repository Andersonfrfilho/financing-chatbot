import type { ClientRepository } from '../../domain/repositories/ClientRepository'

export interface ClientByDocumentData {
  personType: string | null
  name: string | null
  cpf: string | null
  birthDate: string | null   // ISO "YYYY-MM-DD" (o n8n converte p/ DD/MM/AAAA)
  civilStatus: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  monthlyIncome: number | null
  hasCoParticipant: boolean | null
  coParticipantIncome: number | null
  companyName: string | null
  cnpj: string | null
  responsibleName: string | null
  companyRevenue: number | null
}

export interface ClientByDocumentResult {
  found: boolean
  reassigned: boolean
  previousWhatsapp: string | null
  data: ClientByDocumentData | null
}

const num = (v: string | null): number | null => (v == null || v === '' ? null : Number(v))

// Reconhece o cliente pelo CPF (documento) — usado quando ele volta de um número de
// WhatsApp diferente. Se achar e o número for outro, reatribui o cadastro ao número atual
// (evita pedir tudo de novo e mantém o reconhecimento por telefone funcionando depois).
export class FindClientByDocumentUseCase {
  constructor(private readonly repository: ClientRepository) {}

  async execute(cpf: string, whatsapp: string): Promise<ClientByDocumentResult> {
    const digits = (cpf ?? '').replace(/\D/g, '')
    const empty: ClientByDocumentResult = { found: false, reassigned: false, previousWhatsapp: null, data: null }
    if (digits.length !== 11) return empty

    const client = await this.repository.findByCpf(digits)
    if (!client) return empty

    const previousWhatsapp = client.whatsappNumber
    let reassigned = false
    if (previousWhatsapp !== whatsapp && whatsapp) {
      reassigned = await this.repository.reassignWhatsapp(digits, whatsapp)
    }

    return {
      found: true,
      reassigned,
      previousWhatsapp,
      data: {
        personType: client.personType ?? null,
        name: client.name ?? null,
        cpf: client.cpfEncrypted ?? null,
        birthDate: client.birthDate ?? null,
        civilStatus: client.civilStatus ?? null,
        phone: client.phone ?? null,
        email: client.email ?? null,
        city: client.city ?? null,
        state: client.state ?? null,
        monthlyIncome: num(client.monthlyIncomeEncrypted ?? null),
        hasCoParticipant: client.hasCoParticipant ?? null,
        coParticipantIncome: num(client.coParticipantIncomeEncrypted ?? null),
        companyName: client.companyName ?? null,
        cnpj: client.cnpjEncrypted ?? null,
        responsibleName: client.responsibleName ?? null,
        companyRevenue: num(client.companyRevenueEncrypted ?? null),
      },
    }
  }
}
