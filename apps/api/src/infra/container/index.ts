import { db } from '@/infra/database/connection'
import { RedisProvider } from '@/infra/redis/RedisProvider'
import type { WebSocketHub } from '@/infra/websocket/WebSocketHub'
import type { SseHub } from '@/infra/sse/SseHub'

// Fipe
import { FipeCatalogService } from '@/modules/fipe/infra/FipeCatalogService'
import { LookupFipePriceUseCase } from '@/modules/fipe/application/use-cases/LookupFipePriceUseCase'
import { ListFipeModelsUseCase } from '@/modules/fipe/application/use-cases/ListFipeModelsUseCase'
import { ListFipeYearsUseCase } from '@/modules/fipe/application/use-cases/ListFipeYearsUseCase'
import { GetFipeDetailUseCase } from '@/modules/fipe/application/use-cases/GetFipeDetailUseCase'
import { FipeController } from '@/modules/fipe/infra/http/FipeController'

// Conversations (atendimento ao vivo / histórico)
import { DrizzleConversationRepository } from '@/modules/conversations/infra/repositories/DrizzleConversationRepository'
import { LogMessageUseCase } from '@/modules/conversations/application/use-cases/LogMessageUseCase'
import { GetConversationHistoryUseCase } from '@/modules/conversations/application/use-cases/GetConversationHistoryUseCase'
import { ListConversationsUseCase } from '@/modules/conversations/application/use-cases/ListConversationsUseCase'
import { ManageTakeoverUseCase } from '@/modules/conversations/application/use-cases/ManageTakeoverUseCase'
import { SendAgentMessageUseCase } from '@/modules/conversations/application/use-cases/SendAgentMessageUseCase'
import { SendAgentMediaUseCase } from '@/modules/conversations/application/use-cases/SendAgentMediaUseCase'
import { WhatsAppSender } from '@/modules/conversations/infra/WhatsAppSender'
import { ConversationController } from '@/modules/conversations/infra/http/ConversationController'

// Auth
import { DrizzleUserRepository } from '@/modules/auth/infra/repositories/DrizzleUserRepository'
import { LoginUseCase } from '@/modules/auth/application/use-cases/LoginUseCase'
import { RefreshTokenUseCase } from '@/modules/auth/application/use-cases/RefreshTokenUseCase'
import { LogoutUseCase } from '@/modules/auth/application/use-cases/LogoutUseCase'
import { AuthController } from '@/modules/auth/infra/http/AuthController'

// Simulations
import { CreateSimulationUseCase } from '@/modules/simulations/application/use-cases/CreateSimulationUseCase'
import { GetSimulationUseCase } from '@/modules/simulations/application/use-cases/GetSimulationUseCase'
import { SimulationController } from '@/modules/simulations/infra/http/SimulationController'

// Webhook
import { ReceiveWhatsAppWebhookUseCase } from '@/modules/webhook/application/use-cases/ReceiveWhatsAppWebhookUseCase'
import { WebhookController } from '@/modules/webhook/infra/http/WebhookController'

// Clients
import { DrizzleClientRepository } from '@/modules/clients/infra/repositories/DrizzleClientRepository'
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/ListClientsUseCase'
import { GetClientUseCase } from '@/modules/clients/application/use-cases/GetClientUseCase'
import { UpdateClientUseCase } from '@/modules/clients/application/use-cases/UpdateClientUseCase'
import { DeleteClientUseCase } from '@/modules/clients/application/use-cases/DeleteClientUseCase'
import { FindClientByDocumentUseCase } from '@/modules/clients/application/use-cases/FindClientByDocumentUseCase'
import { ClientController } from '@/modules/clients/infra/http/ClientController'

// Leads
import { DrizzleLeadRepository } from '@/modules/leads/infra/repositories/DrizzleLeadRepository'
import { ListLeadsUseCase } from '@/modules/leads/application/use-cases/ListLeadsUseCase'
import { GetLeadUseCase } from '@/modules/leads/application/use-cases/GetLeadUseCase'
import { CreateLeadUseCase } from '@/modules/leads/application/use-cases/CreateLeadUseCase'
import { UpdateLeadStatusUseCase } from '@/modules/leads/application/use-cases/UpdateLeadStatusUseCase'
import { LeadController } from '@/modules/leads/infra/http/LeadController'

// Banks
import { DrizzleBankRepository } from '@/modules/banks/infra/repositories/DrizzleBankRepository'
import { ListBanksUseCase } from '@/modules/banks/application/use-cases/ListBanksUseCase'
import { GetBankRatesAdminUseCase } from '@/modules/banks/application/use-cases/GetBankRatesAdminUseCase'
import { CreateBankRateUseCase } from '@/modules/banks/application/use-cases/CreateBankRateUseCase'
import { BankController } from '@/modules/banks/infra/http/BankController'

// Users
import { DrizzleUserManagementRepository } from '@/modules/users/infra/repositories/DrizzleUserManagementRepository'
import { ListUsersUseCase } from '@/modules/users/application/use-cases/ListUsersUseCase'
import { CreateUserUseCase } from '@/modules/users/application/use-cases/CreateUserUseCase'
import { UpdateUserUseCase } from '@/modules/users/application/use-cases/UpdateUserUseCase'
import { UserController } from '@/modules/users/infra/http/UserController'

// Sessions
import { DrizzleSessionRepository } from '@/modules/sessions/infra/repositories/DrizzleSessionRepository'
import { ListSessionsUseCase } from '@/modules/sessions/application/use-cases/ListSessionsUseCase'
import { ResetSessionUseCase } from '@/modules/sessions/application/use-cases/ResetSessionUseCase'
import { SessionController } from '@/modules/sessions/infra/http/SessionController'

// Dashboard
import { GetDashboardStatsUseCase } from '@/modules/dashboard/application/use-cases/GetDashboardStatsUseCase'
import { GetCommercialReportUseCase } from '@/modules/dashboard/application/use-cases/GetCommercialReportUseCase'
import { DashboardController } from '@/modules/dashboard/infra/http/DashboardController'

// Settings
import { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { UpdateMaxAgentSessionsUseCase } from '@/modules/settings/application/use-cases/UpdateMaxAgentSessionsUseCase'
import { SettingsController } from '@/modules/settings/infra/http/SettingsController'

export interface AppContainer {
  cache: RedisProvider
  wsHub: WebSocketHub
  authController: AuthController
  simulationController: SimulationController
  webhookController: WebhookController
  clientController: ClientController
  leadController: LeadController
  bankController: BankController
  userController: UserController
  sessionController: SessionController
  dashboardController: DashboardController
  fipeController: FipeController
  conversationController: ConversationController
  settingsController: SettingsController
}

export function buildContainer(wsHub: WebSocketHub, sseHub: SseHub): AppContainer {
  const cache = new RedisProvider()
  const userRepository = new DrizzleUserRepository(db)

  // Auth
  const loginUseCase = new LoginUseCase(userRepository, cache)
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, cache)
  const logoutUseCase = new LogoutUseCase(cache)
  const authController = new AuthController(loginUseCase, refreshTokenUseCase, logoutUseCase)

  // Simulations
  const createSimulationUseCase = new CreateSimulationUseCase(db, cache, wsHub)
  const getSimulationUseCase = new GetSimulationUseCase(db)
  const simulationController = new SimulationController(createSimulationUseCase, getSimulationUseCase)

  // Clients
  const clientRepository = new DrizzleClientRepository()
  const clientController = new ClientController(
    new ListClientsUseCase(clientRepository),
    new GetClientUseCase(clientRepository),
    new UpdateClientUseCase(clientRepository),
    new DeleteClientUseCase(clientRepository),
    new FindClientByDocumentUseCase(clientRepository),
  )

  // Leads
  const leadRepository = new DrizzleLeadRepository()
  const leadController = new LeadController(
    new ListLeadsUseCase(leadRepository),
    new GetLeadUseCase(leadRepository),
    new CreateLeadUseCase(leadRepository),
    new UpdateLeadStatusUseCase(leadRepository),
  )

  // Banks
  const bankRepository = new DrizzleBankRepository()
  const bankController = new BankController(
    new ListBanksUseCase(bankRepository),
    new GetBankRatesAdminUseCase(bankRepository),
    new CreateBankRateUseCase(bankRepository),
  )

  // Users
  const userManagementRepository = new DrizzleUserManagementRepository()
  const userController = new UserController(
    new ListUsersUseCase(userManagementRepository),
    new CreateUserUseCase(userManagementRepository),
    new UpdateUserUseCase(userManagementRepository),
    userManagementRepository,
  )

  // Sessions
  const sessionRepository = new DrizzleSessionRepository()
  const sessionController = new SessionController(
    new ListSessionsUseCase(sessionRepository),
    new ResetSessionUseCase(sessionRepository),
    sessionRepository,
  )

  // Dashboard
  const dashboardController = new DashboardController(
    new GetDashboardStatsUseCase(),
    new GetCommercialReportUseCase(),
  )

  // Settings (needed before conversations)
  const appConfigRepository = new AppConfigRepository()

  // Conversations (must be before webhook)
  const conversationRepository = new DrizzleConversationRepository()
  const whatsAppSender = new WhatsAppSender()
  const conversationController = new ConversationController(
    new LogMessageUseCase(conversationRepository, sseHub),
    new GetConversationHistoryUseCase(conversationRepository),
    new ListConversationsUseCase(conversationRepository),
    new ManageTakeoverUseCase(conversationRepository, appConfigRepository, whatsAppSender),
    new SendAgentMessageUseCase(conversationRepository, whatsAppSender, sseHub),
    new SendAgentMediaUseCase(conversationRepository, whatsAppSender, sseHub),
    whatsAppSender,
  )

  // Webhook (after conversations)
  const receiveWebhookUseCase = new ReceiveWhatsAppWebhookUseCase(cache, conversationRepository)
  const webhookController = new WebhookController(receiveWebhookUseCase)

  // Fipe
  const fipeCatalog = new FipeCatalogService(cache)
  const fipeController = new FipeController(
    new LookupFipePriceUseCase(fipeCatalog),
    new ListFipeModelsUseCase(fipeCatalog),
    new ListFipeYearsUseCase(fipeCatalog),
    new GetFipeDetailUseCase(fipeCatalog),
  )
  const settingsController = new SettingsController(
    new UpdateMaxAgentSessionsUseCase(appConfigRepository),
  )

  return {
    cache,
    wsHub,
    authController,
    simulationController,
    webhookController,
    clientController,
    leadController,
    bankController,
    userController,
    sessionController,
    dashboardController,
    fipeController,
    conversationController,
    settingsController,
  }
}
