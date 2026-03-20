COMPOSE := docker compose -f infra/compose/compose.yaml

.PHONY: up-infra migrate up down ps logs health smoke restart-api restart-worker restart-engine restart-web

up-infra:
	$(COMPOSE) up -d postgres redis

migrate:
	$(COMPOSE) run --rm migrate

up:
	$(COMPOSE) up -d postgres redis
	$(COMPOSE) run --rm migrate
	$(COMPOSE) up -d api worker market-engine web

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs --tail=200 api worker market-engine web postgres redis

health:
	./scripts/health-check.sh

smoke:
	./scripts/smoke-test.sh

restart-api:
	$(COMPOSE) up -d api

restart-worker:
	$(COMPOSE) up -d worker

restart-engine:
	$(COMPOSE) up -d market-engine

restart-web:
	$(COMPOSE) up -d web
