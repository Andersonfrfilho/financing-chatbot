-- conversation_state passa a ser varchar: a máquina de estados do bot evolui com frequência
-- e o enum bloqueava novos estados (ex.: awaiting_vehicle_model_select / awaiting_vehicle_year_select),
-- derrubando o nó "Salvar Sessão" com "invalid input value for enum". varchar elimina o acoplamento.
ALTER TABLE "conversation_sessions" ALTER COLUMN "current_state" DROP DEFAULT;
ALTER TABLE "conversation_sessions" ALTER COLUMN "current_state" TYPE varchar(64) USING "current_state"::text;
ALTER TABLE "conversation_sessions" ALTER COLUMN "current_state" SET DEFAULT 'greeting';
