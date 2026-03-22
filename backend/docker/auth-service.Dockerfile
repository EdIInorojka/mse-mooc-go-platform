FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/auth-service ./cmd/auth-service

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/auth-service /auth-service
EXPOSE 8081
ENTRYPOINT ["/auth-service"]
