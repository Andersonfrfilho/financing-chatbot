// Mapeamento centralizado de valores de contexto do bot para português
export const VALUE_LABELS: Record<string, Record<string, string>> = {
  consignadoTipo: {
    inss_apos:         'INSS Aposentado',
    inss_pension:      'INSS Pensionista',
    servidor_federal:  'Servidor Federal',
    servidor_estadual: 'Servidor Estadual',
    servidor_municipal:'Servidor Municipal',
    militar:           'Militar',
    clt:               'CLT',
  },
  requestedProduct: {
    consignado:   'Consignado',
    imobiliario:  'Financiamento Imobiliário',
    veiculo:      'Financiamento Veículo',
    consorcio:    'Consórcio',
    pessoal:      'Crédito Pessoal',
    empresa:      'Crédito Empresarial',
    rural:        'Crédito Rural',
  },
  imovelCond: {
    novo:      'Imóvel Novo',
    usado:     'Imóvel Usado',
    construcao:'Construção',
  },
  construcaoTipo: {
    alvenaria: 'Alvenaria',
    madeira:   'Madeira',
    misto:     'Misto',
  },
  consignadoAtivo: { sim: 'Sim', nao: 'Não', true: 'Sim', false: 'Não' },
  jaTemImovel:     { sim: 'Sim', nao: 'Não', true: 'Sim', false: 'Não' },
  fgts3anos:       { sim: 'Sim', nao: 'Não', true: 'Sim', false: 'Não' },
  imovelQuitado:   { sim: 'Sim', nao: 'Não', true: 'Sim', false: 'Não' },
}
