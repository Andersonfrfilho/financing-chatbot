// Teardown: retorna estrutura final para o n8n persistir e enviar

return {
  json: {
    phone,
    response: routerResult.response,
    newState: routerResult.newState,
    newContext: routerResult.newContext,
    triggerSimulation: routerResult.triggerSimulation ?? false,
    simulationPayload: routerResult.simulationPayload ?? null,
    triggerHandoff: routerResult.triggerHandoff ?? false,
    handoffData: routerResult.triggerHandoff ? {
      phone,
      name: routerResult.newContext?.name,
      financingType: routerResult.newContext?.financingType,
      simulationId: routerResult.newContext?.simulationId,
    } : null,
  },
}
