import { createWhatsAppProvider } from '@adatechnology/whatsapp-provider'
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
import { ForgotPasswordUseCase } from '@/modules/auth/application/use-cases/ForgotPasswordUseCase'
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/ResetPasswordUseCase'
import { AuthController } from '@/modules/auth/infra/http/AuthController'
import { NodemailerEmailProvider } from '@/infra/email/NodemailerEmailProvider'

// Simulations
import { CreateSimulationUseCase } from '@/modules/simulations/application/use-cases/CreateSimulationUseCase'
import { GetSimulationUseCase } from '@/modules/simulations/application/use-cases/GetSimulationUseCase'
import { ListSimulationsUseCase } from '@/modules/simulations/application/use-cases/ListSimulationsUseCase'
import { DrizzleSimulationRepository } from '@/modules/simulations/infra/repositories/DrizzleSimulationRepository'
import { SimulationController } from '@/modules/simulations/infra/http/SimulationController'

// Webhook
import { ReceiveWhatsAppWebhookUseCase } from '@/modules/webhook/application/use-cases/ReceiveWhatsAppWebhookUseCase'
import { WebhookController } from '@/modules/webhook/infra/http/WebhookController'

// Clients
import { DrizzleClientRepository } from '@/modules/clients/infra/repositories/DrizzleClientRepository'
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/ListClientsUseCase'
import { GetClientUseCase } from '@/modules/clients/application/use-cases/GetClientUseCase'
import { CreateClientUseCase } from '@/modules/clients/application/use-cases/CreateClientUseCase'
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

// Categories
import { DrizzleCategoryRepository } from '@/modules/categories/infra/repositories/DrizzleCategoryRepository'
import { CategorySyncService } from '@/modules/categories/application/services/CategorySyncService'
import { ListCategoriesUseCase } from '@/modules/categories/application/use-cases/ListCategoriesUseCase'
import { GetCategoryUseCase } from '@/modules/categories/application/use-cases/GetCategoryUseCase'
import { CreateCategoryUseCase } from '@/modules/categories/application/use-cases/CreateCategoryUseCase'
import { UpdateCategoryUseCase } from '@/modules/categories/application/use-cases/UpdateCategoryUseCase'
import { DeleteCategoryUseCase } from '@/modules/categories/application/use-cases/DeleteCategoryUseCase'
import { RetryCategorySyncUseCase } from '@/modules/categories/application/use-cases/RetryCategorySyncUseCase'
import { CategoryController } from '@/modules/categories/infra/http/CategoryController'

// Products
import { DrizzleProductRepository } from '@/modules/products/infra/repositories/DrizzleProductRepository'
import { ProductSyncService } from '@/modules/products/application/services/ProductSyncService'
import { ListProductsUseCase } from '@/modules/products/application/use-cases/ListProductsUseCase'
import { GetProductUseCase } from '@/modules/products/application/use-cases/GetProductUseCase'
import { CreateProductUseCase } from '@/modules/products/application/use-cases/CreateProductUseCase'
import { UpdateProductUseCase } from '@/modules/products/application/use-cases/UpdateProductUseCase'
import { DeleteProductUseCase } from '@/modules/products/application/use-cases/DeleteProductUseCase'
import { RetryProductSyncUseCase } from '@/modules/products/application/use-cases/RetryProductSyncUseCase'
import { ProductController } from '@/modules/products/infra/http/ProductController'

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
  categoryController: CategoryController
  productController: ProductController
}

export function buildContainer(wsHub: WebSocketHub, sseHub: SseHub): AppContainer {
  const cache = new RedisProvider()
  const userRepository = new DrizzleUserRepository(db)

  // WhatsApp provider (shared across conversations, settings, categories, products)
  const whatsAppProvider = createWhatsAppProvider({
    accessToken:   process.env.WHATSAPP_ACCESS_TOKEN ?? '',
    apiVersion:    process.env.WHATSAPP_API_VERSION,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    catalogId:     process.env.WHATSAPP_CATALOG_ID,
    wabaId:        process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  })

  // Settings (needed by auth for email flag)
  const appConfigRepository = new AppConfigRepository()

  // Auth
  const emailProvider = new NodemailerEmailProvider()
  const loginUseCase = new LoginUseCase(userRepository, cache)
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, cache)
  const logoutUseCase = new LogoutUseCase(cache)
  const forgotPasswordUseCase = new ForgotPasswordUseCase(emailProvider, appConfigRepository)
  const resetPasswordUseCase = new ResetPasswordUseCase()
  const authController = new AuthController(loginUseCase, refreshTokenUseCase, logoutUseCase, forgotPasswordUseCase, resetPasswordUseCase)

  // Simulations
  const simulationRepository = new DrizzleSimulationRepository()
  const createSimulationUseCase = new CreateSimulationUseCase(db, cache, wsHub)
  const getSimulationUseCase = new GetSimulationUseCase(db)
  const listSimulationsUseCase = new ListSimulationsUseCase(simulationRepository)
  const simulationController = new SimulationController(createSimulationUseCase, getSimulationUseCase, listSimulationsUseCase)

  // Clients
  const clientRepository = new DrizzleClientRepository()
  const clientController = new ClientController(
    new ListClientsUseCase(clientRepository),
    new GetClientUseCase(clientRepository),
    new CreateClientUseCase(clientRepository),
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

  // Conversations (must be before webhook)
  const conversationRepository = new DrizzleConversationRepository()
  const whatsAppSender = new WhatsAppSender(whatsAppProvider.messages)
  const conversationController = new ConversationController(
    new LogMessageUseCase(conversationRepository, sseHub),
    new GetConversationHistoryUseCase(conversationRepository),
    new ListConversationsUseCase(conversationRepository),
    new ManageTakeoverUseCase(conversationRepository, appConfigRepository, whatsAppSender),
    new SendAgentMessageUseCase(conversationRepository, whatsAppSender, sseHub),
    new SendAgentMediaUseCase(conversationRepository, whatsAppSender, sseHub),
    whatsAppSender,
    appConfigRepository,
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
    appConfigRepository,
    whatsAppProvider.templates,
  )

  // Categories
  const categoryRepository = new DrizzleCategoryRepository()
  const categorySyncService = new CategorySyncService(categoryRepository, whatsAppProvider.catalog)
  const categoryController = new CategoryController(
    new ListCategoriesUseCase(categoryRepository),
    new GetCategoryUseCase(categoryRepository),
    new CreateCategoryUseCase(categoryRepository, categorySyncService),
    new UpdateCategoryUseCase(categoryRepository, categorySyncService),
    new DeleteCategoryUseCase(categoryRepository, whatsAppProvider.catalog),
    new RetryCategorySyncUseCase(categoryRepository, categorySyncService),
  )

  // Products
  const productRepository = new DrizzleProductRepository()
  const productSyncService = new ProductSyncService(productRepository, whatsAppProvider.catalog)
  const productController = new ProductController(
    new ListProductsUseCase(productRepository),
    new GetProductUseCase(productRepository),
    new CreateProductUseCase(productRepository, productSyncService),
    new UpdateProductUseCase(productRepository, productSyncService),
    new DeleteProductUseCase(productRepository, whatsAppProvider.catalog),
    new RetryProductSyncUseCase(productRepository, productSyncService),
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
    categoryController,
    productController,
  }
}
