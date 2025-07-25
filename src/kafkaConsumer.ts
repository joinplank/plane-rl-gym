/**
 * Kafka Consumer Service for Change Data Capture (CDC)
 *
 * This service consumes messages from Kafka topics created by Kafka Connect/Debezium
 * and stores transaction logs in the database. It handles CREATE, UPDATE, and DELETE
 * operations from various database tables.
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import {
  DebeziumPayload,
  TransactionLogRecord,
  TopicConfig,
} from './types';
// Database connection - avoid importing client.ts to prevent OpenAI dependency
const CONNECTION_URL = process.env.CONNECTION_URL || 'postgresql://plane:plane@plane-db:5432/plane';
import { INSERT_ORDER } from './tableOrder';

dotenv.config();

// Environment variables
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'plane-cdc-consumer';
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'plane-cdc-client';

class KafkaConsumerService {
  private kafka: Kafka;
  private consumer: Consumer;
  private pgClient: Client;
  private topics: TopicConfig[] = [];

  constructor() {
    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: [KAFKA_BROKER],
      retry: {
        retries: 5,
        initialRetryTime: 1000,
      },
    });

    // Create consumer instance
    this.consumer = this.kafka.consumer({
      groupId: KAFKA_GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    // Create dedicated PostgreSQL client for consumer
    this.pgClient = new Client({ connectionString: CONNECTION_URL });

    // Initialize topics from INSERT_ORDER configuration
    this.initializeTopics();
  }

  /**
   * Initialize topics based on tables in INSERT_ORDER
   */
  private initializeTopics(): void {
    this.topics = INSERT_ORDER.map((table) => ({
      topic: `plane.public.${table}`,
      table: table,
    }));

    console.log(`Initialized ${this.topics.length} topics:`, 
      this.topics.map(t => t.topic).join(', '));
  }

  /**
   * Transform Debezium operation to human-readable operation
   */
  private mapOperation(op: string): 'INSERT' | 'UPDATE' | 'DELETE' {
    switch (op) {
      case 'c':
      case 'r': // read operations during snapshot are treated as inserts
        return 'INSERT';
      case 'u':
        return 'UPDATE';
      case 'd':
        return 'DELETE';
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }

  /**
   * Extract table name from Kafka topic
   * Topic format: plane.public.table_name -> table_name
   */
  private extractTableNameFromTopic(topic: string): string {
    const parts = topic.split('.');
    return parts[parts.length - 1]; // Return the last part (table name)
  }

  /**
   * Process a Kafka message and store transaction log
   */
  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, message } = payload;

    if (!message.value) {
      console.log(`Empty message received from topic ${topic}`);
      return;
    }

    try {
      // Parse Debezium message
      const debeziumPayload: DebeziumPayload = JSON.parse(
        message.value.toString()
      );

      // Skip if this is a schema change or other non-data message
      if (!debeziumPayload.source || !debeziumPayload.op) {
        console.log(`Skipping non-data message from topic ${topic}`);
        return;
      }

      // Create transaction log record
      console.log(debeziumPayload);
      const transactionRecord: TransactionLogRecord = {
        id: uuidv4(),
        created_at: new Date(),
        entity_table: this.extractTableNameFromTopic(topic),
        operation: this.mapOperation(debeziumPayload.op),
        before: debeziumPayload.before || null,
        after: debeziumPayload.after || null,
      };

      // Store in database
      await this.storeTransactionLog(transactionRecord, debeziumPayload);

      console.log(
        `Processed ${transactionRecord.operation} operation for table ${transactionRecord.entity_table}`
      );
    } catch (error) {
      console.error(
        `Error processing message from topic ${topic}:`,
        error
      );
      // You might want to implement dead letter queue or retry logic here
    }
  }

  /**
   * Store transaction log record in the database
   */
  private async storeTransactionLog(
    record: TransactionLogRecord,
    debeziumPayload: DebeziumPayload
  ): Promise<void> {
    const query = `
      INSERT INTO transaction_log (id, created_at, entity_table, operation, before, after)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      record.id,
      record.created_at,
      record.entity_table,
      record.operation,
      JSON.stringify(record.before),
      JSON.stringify(record.after),
    ];

    try {
      await this.pgClient.query(query, values);
    } catch (error) {
      console.error(
        `Failed to store transaction log for table ${record.entity_table}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if transaction_log table exists, create if not
   */
  private async ensureTransactionLogTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS transaction_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        entity_table VARCHAR(255) NOT NULL,
        operation VARCHAR(10),
        before JSONB DEFAULT 'null',
        after JSONB DEFAULT 'null'
      );
    `;

    try {
      await this.pgClient.query(createTableQuery);
      console.log('Transaction log table is ready');
    } catch (error) {
      console.error('Failed to create transaction_log table:', error);
      throw error;
    }
  }

  private async cleanupTransactionLogTable(): Promise<void> {
    const cleanupQuery = `
      TRUNCATE TABLE transaction_log CASCADE;
    `;

    try {
      await this.pgClient.query(cleanupQuery);
      console.log('✅ Transaction log table cleaned up');
    } catch (error) {
      console.error('Failed to clean up transaction_log table:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages from Kafka
   */
  public async start(): Promise<void> {
    console.log('🚀 Starting Kafka consumer service...');
    
    try {
      // Connect to PostgreSQL
      console.log('📊 Connecting to PostgreSQL...');
      try {
        // Test the connection first
        await this.pgClient.connect();
        console.log('✅ Connected to PostgreSQL');
      } catch (dbError) {
        console.log('📊 PostgreSQL already connected or connection failed:', dbError instanceof Error ? dbError.message : String(dbError));
      }

      // Ensure transaction log table exists
      console.log('📝 Setting up transaction log table...');
      await this.ensureTransactionLogTable();

      await this.cleanupTransactionLogTable();

      // Connect to Kafka
      console.log('🔄 Connecting to Kafka...');
      await this.consumer.connect();
      console.log('✅ Connected to Kafka');

      // Subscribe to all topics
      const topicNames = this.topics.map((t) => t.topic);
      console.log('📡 Subscribing to topics...');
      await this.consumer.subscribe({
        topics: topicNames,
        fromBeginning: false, // Start from latest to avoid processing old data
      });

      console.log(`✅ Subscribed to ${topicNames.length} topics`);
      console.log('🎯 Topics:', topicNames.join(', '));

      // Start consuming messages
      console.log('🔄 Starting message consumption...');
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.processMessage(payload);
        },
      });

      console.log('🎉 Kafka consumer is running and waiting for messages...');
    } catch (error) {
      console.error('❌ Failed to start Kafka consumer:', error);
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * Stop the consumer and clean up connections
   */
  public async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping Kafka consumer...');
      
      if (this.consumer) {
        await this.consumer.disconnect();
        console.log('✅ Kafka consumer disconnected');
      }

      try {
        await this.pgClient.end();
        console.log('✅ PostgreSQL connection closed');
      } catch (pgError) {
        console.log('📊 PostgreSQL connection already closed or error:', pgError instanceof Error ? pgError.message : String(pgError));
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Get consumer statistics
   */
  public async getStats(): Promise<any> {
    // This could be extended to return useful metrics
    return {
      topics: this.topics.length,
      connectedTopics: this.topics.map(t => t.topic),
    };
  }
}

// Handle graceful shutdown
const consumer = new KafkaConsumerService();

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await consumer.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await consumer.stop();
  process.exit(0);
});

// Start the consumer
consumer.start().catch((error) => {
  console.error('Failed to start consumer:', error);
  process.exit(1);
});

export default KafkaConsumerService; 