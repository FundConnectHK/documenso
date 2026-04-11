docker-install:
	@echo "Installing Docker..."
	docker compose -f ./docker/production/compose.yml up
