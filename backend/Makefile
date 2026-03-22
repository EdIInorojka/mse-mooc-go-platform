SHELL := /bin/sh

.PHONY: run-auth run-course run-enrollment run-gateway test build tidy

run-auth:
	go run ./cmd/auth-service

run-course:
	go run ./cmd/course-service

run-enrollment:
	go run ./cmd/enrollment-service

run-gateway:
	go run ./cmd/api-gateway

test:
	go test ./...

build:
	go build ./cmd/...

tidy:
	go mod tidy