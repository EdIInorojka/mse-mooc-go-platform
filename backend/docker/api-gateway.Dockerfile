FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api-gateway ./cmd/api-gateway

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/api-gateway /api-gateway
EXPOSE 8080
ENTRYPOINT ["/api-gateway"]
