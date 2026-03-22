FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/enrollment-service ./cmd/enrollment-service

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/enrollment-service /enrollment-service
EXPOSE 8083
ENTRYPOINT ["/enrollment-service"]
