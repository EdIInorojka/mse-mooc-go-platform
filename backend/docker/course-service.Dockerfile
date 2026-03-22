FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/course-service ./cmd/course-service

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/course-service /course-service
EXPOSE 8082
ENTRYPOINT ["/course-service"]
