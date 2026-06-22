// Mapeamento centralizado de estados do bot para português
export const STATE_LABELS: Record<string, { label: string; color: string }> = {
  // Novos/Iniciais
  new: { label: 'Novo', color: 'bg-gray-100 text-gray-600' },

  // Aguardando entrada
  awaiting_menu: { label: 'No menu', color: 'bg-blue-100 text-blue-700' },
  awaiting_hab_type: { label: 'Selecionando habitação', color: 'bg-blue-100 text-blue-700' },
  awaiting_vehicle_model: { label: 'Selecionando veículo', color: 'bg-blue-100 text-blue-700' },
  awaiting_financing_type: { label: 'Selecionando tipo', color: 'bg-blue-100 text-blue-700' },

  // Em processamento
  in_flow: { label: 'Em captação', color: 'bg-purple-100 text-purple-700' },
  simulation_ready: { label: 'Simulação pronta', color: 'bg-green-100 text-green-700' },

  // Atendimento
  human: { label: 'Atendimento humano', color: 'bg-yellow-100 text-yellow-700' },
  human_handoff: { label: 'Aguardando atendimento', color: 'bg-yellow-100 text-yellow-700' },

  // Finais
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  abandoned: { label: 'Abandonado', color: 'bg-red-100 text-red-700' },
}
