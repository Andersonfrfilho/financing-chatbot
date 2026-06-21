# ADR-004: Criptografia de Dados Sensíveis em Repouso (LGPD)

**Status:** Aceito  
**Data:** 2026-06-19  
**Autores:** Time de desenvolvimento

---

## Contexto

O sistema coleta dados pessoais sensíveis de natureza financeira via WhatsApp: CPF, renda mensal, renda familiar, saldo FGTS e valor de entrada. A LGPD (Lei 13.709/2018) classifica dados financeiros como dados pessoais de natureza sensível ou dados com impacto relevante na vida do titular, exigindo proteção adicional.

## Decisão

Campos financeiros e CPF são **criptografados antes de persistir** no banco de dados e **descriptografados na leitura**, usando AES-256-GCM.

## Campos Afetados

| Tabela | Coluna em banco | Dado real |
|--------|----------------|-----------|
| `financing_clients` | `cpf_encrypted` | CPF sem formatação |
| `financing_clients` | `monthly_income_encrypted` | Renda mensal em R$ |
| `financing_clients` | `family_income_encrypted` | Renda familiar em R$ |
| `financing_clients` | `fgts_amount_encrypted` | Saldo FGTS em R$ |
| `financing_clients` | `down_payment_amount_encrypted` | Valor de entrada em R$ |

## Algoritmo

- **AES-256-GCM** (Galois/Counter Mode)
- IV aleatório de 12 bytes por operação de encrypt (não reutilizado)
- Auth tag de 16 bytes para integridade
- Chave de 256 bits derivada de `ENCRYPTION_KEY` (variável de ambiente)
- Formato armazenado: `{iv_hex}:{ciphertext_hex}:{authtag_hex}`

## Consequências

- **Busca:** não é possível fazer `WHERE cpf = ?` diretamente — buscas por CPF requerem descriptografar ou manter um hash de busca separado (indexado com SHA-256)
- **Performance:** overhead de ~1ms por campo (negligenciável)
- **Chave de criptografia:** `ENCRYPTION_KEY` deve ser armazenada em variável de ambiente segura (Railway secrets, AWS Secrets Manager), nunca em código ou banco
- **Rotação de chave:** requer re-criptografia de todos os registros (processo batch offline)

## O que NÃO é criptografado

Dados não sensíveis ficam em plaintext para permitir queries eficientes:
- Nome (`name`)
- E-mail (`email`)
- Cidade/estado (`city`, `state`)
- Data de nascimento (`birth_date`) — considerada pseudonimização suficiente
- Estado civil (`civil_status`)
- Número WhatsApp (`whatsapp_number`)

## Alternativas Descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Criptografia no banco (pgcrypto) | Chave na camada de banco = acesso ao banco compromete tudo |
| Sem criptografia | Viola LGPD para dados financeiros; risco regulatório |
| Tokenização (vault externo) | Complexidade excessiva para v1; latência adicional |
| Apenas TLS em trânsito | LGPD requer proteção em repouso para dados sensíveis |
