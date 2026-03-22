package events

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"
)

type Publisher interface {
	Publish(ctx context.Context, topic, key string, payload any) error
	Close() error
}

type Event struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`
	OccurredAt time.Time `json:"occurred_at"`
	Payload    any       `json:"payload"`
}

type NoopPublisher struct{}

func (NoopPublisher) Publish(context.Context, string, string, any) error { return nil }
func (NoopPublisher) Close() error                                       { return nil }

type KafkaPublisher struct {
	brokers []string
	writers map[string]*kafka.Writer
	mu      sync.Mutex
}

func NewPublisher(brokers []string) Publisher {
	if len(brokers) == 0 {
		return NoopPublisher{}
	}
	return &KafkaPublisher{
		brokers: brokers,
		writers: make(map[string]*kafka.Writer),
	}
}

func (p *KafkaPublisher) Publish(ctx context.Context, topic, key string, payload any) error {
	if topic == "" {
		return nil
	}
	eventID, err := randomID()
	if err != nil {
		return err
	}
	message, err := json.Marshal(Event{
		ID:         eventID,
		Type:       topic,
		OccurredAt: time.Now().UTC(),
		Payload:    payload,
	})
	if err != nil {
		return err
	}
	return p.writer(topic).WriteMessages(ctx, kafka.Message{
		Key:   []byte(key),
		Value: message,
		Time:  time.Now().UTC(),
	})
}

func (p *KafkaPublisher) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	var firstErr error
	for topic, writer := range p.writers {
		if err := writer.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
		delete(p.writers, topic)
	}
	return firstErr
}

func (p *KafkaPublisher) writer(topic string) *kafka.Writer {
	p.mu.Lock()
	defer p.mu.Unlock()
	if writer, ok := p.writers[topic]; ok {
		return writer
	}
	writer := &kafka.Writer{
		Addr:                   kafka.TCP(p.brokers...),
		Topic:                  topic,
		Balancer:               &kafka.LeastBytes{},
		AllowAutoTopicCreation: true,
		RequiredAcks:           kafka.RequireOne,
	}
	p.writers[topic] = writer
	return writer
}

func randomID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
