/**
 * Health Check Service for Kafka Consumer
 *
 * This utility provides health checks for the Kafka consumer service,
 * including database connectivity, Kafka connectivity, and service status.
 */

import { Client } from 'pg';
import { Kafka } from 'kafkajs';
import * as dotenv from 'dotenv';
import { pgClient } from './client';

dotenv.config();

interface HealthStatus {
  healthy: boolean;
  timestamp: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      message?: string;
      latency?: number;
    };
    kafka: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      message?: string;
      latency?: number;
    };
    transactionLog: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      message?: string;
      recordCount?: number;
    };
  };
}

class HealthChecker {
  private pgClient: Client;
  private kafka: Kafka;

  constructor() {
    this.pgClient = pgClient;
    this.kafka = new Kafka({
      clientId: 'health-check-client',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
      connectionTimeout: 5000,
      requestTimeout: 5000,
    });
  }

  /**
   * Check PostgreSQL database connectivity
   */
  private async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    message?: string;
    latency: number;
  }> {
    const startTime = Date.now();

    try {
      if (!this.pgClient.connection) {
        await this.pgClient.connect();
      }

      await this.pgClient.query('SELECT 1');
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Database connection successful',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
        latency,
      };
    }
  }

  /**
   * Check Kafka connectivity
   */
  private async checkKafka(): Promise<{
    status: 'healthy' | 'unhealthy';
    message?: string;
    latency: number;
  }> {
    const startTime = Date.now();

    try {
      const admin = this.kafka.admin();
      await admin.connect();

      // Try to list topics as a connectivity test
      await admin.listTopics();
      await admin.disconnect();

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Kafka connection successful',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: `Kafka connection failed: ${error instanceof Error ? error.message : String(error)}`,
        latency,
      };
    }
  }

  /**
   * Check transaction log table status
   */
  private async checkTransactionLog(): Promise<{
    status: 'healthy' | 'unhealthy';
    message?: string;
    recordCount?: number;
  }> {
    try {
      if (!this.pgClient.connection) {
        await this.pgClient.connect();
      }

      // Check if table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'transaction_log'
        );
      `;

      const tableResult = await this.pgClient.query(tableExistsQuery);
      const tableExists = tableResult.rows[0].exists;

      if (!tableExists) {
        return {
          status: 'unhealthy',
          message: 'transaction_log table does not exist',
        };
      }

      // Get record count
      const countQuery = 'SELECT COUNT(*) as count FROM transaction_log';
      const countResult = await this.pgClient.query(countQuery);
      const recordCount = parseInt(countResult.rows[0].count, 10);

      return {
        status: 'healthy',
        message: 'Transaction log table is accessible',
        recordCount,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Transaction log check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  public async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();

    // Run all health checks in parallel
    const [databaseStatus, kafkaStatus, transactionLogStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkKafka(),
      this.checkTransactionLog(),
    ]);

    const allHealthy = 
      databaseStatus.status === 'healthy' &&
      kafkaStatus.status === 'healthy' &&
      transactionLogStatus.status === 'healthy';

    return {
      healthy: allHealthy,
      timestamp,
      services: {
        database: databaseStatus,
        kafka: kafkaStatus,
        transactionLog: transactionLogStatus,
      },
    };
  }

  /**
   * Run health check and log results
   */
  public async runHealthCheck(): Promise<void> {
    console.log('🔍 Running health check...');

    try {
      const status = await this.getHealthStatus();

      console.log('📊 Health Check Results:');
      console.log(`Overall Status: ${status.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      console.log(`Timestamp: ${status.timestamp}`);
      console.log('');

      // Database status
      const dbStatus = status.services.database;
      console.log(`🗄️  Database: ${dbStatus.status === 'healthy' ? '✅' : '❌'} ${dbStatus.status.toUpperCase()}`);
      console.log(`   Message: ${dbStatus.message}`);
      console.log(`   Latency: ${dbStatus.latency}ms`);
      console.log('');

      // Kafka status
      const kafkaStatus = status.services.kafka;
      console.log(`🔄 Kafka: ${kafkaStatus.status === 'healthy' ? '✅' : '❌'} ${kafkaStatus.status.toUpperCase()}`);
      console.log(`   Message: ${kafkaStatus.message}`);
      console.log(`   Latency: ${kafkaStatus.latency}ms`);
      console.log('');

      // Transaction log status
      const txLogStatus = status.services.transactionLog;
      console.log(`📝 Transaction Log: ${txLogStatus.status === 'healthy' ? '✅' : '❌'} ${txLogStatus.status.toUpperCase()}`);
      console.log(`   Message: ${txLogStatus.message}`);
      if (txLogStatus.recordCount !== undefined) {
        console.log(`   Records: ${txLogStatus.recordCount}`);
      }
      console.log('');

      if (!status.healthy) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    }
  }

  /**
   * Clean up connections
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.pgClient && this.pgClient.connection) {
        await this.pgClient.end();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  const healthChecker = new HealthChecker();

  process.on('SIGTERM', async () => {
    await healthChecker.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await healthChecker.cleanup();
    process.exit(0);
  });

  healthChecker.runHealthCheck()
    .then(() => {
      return healthChecker.cleanup();
    })
    .catch(async (error) => {
      console.error('Health check failed:', error);
      await healthChecker.cleanup();
      process.exit(1);
    });
}

export default HealthChecker; 