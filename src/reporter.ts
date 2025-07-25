/**
 * Transaction Log Reporter Service
 *
 * This service provides REST API endpoints to query and analyze transaction logs
 * captured by the Kafka CDC consumer. It offers filtering, pagination, and
 * aggregation capabilities for monitoring database changes.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { pgClient } from './client';
import * as dotenv from 'dotenv';
import { resetDatabase, importData } from './index';
import { INSERT_ORDER } from './config';

dotenv.config();

// Database connection - reuse the same connection string as consumer
const CONNECTION_URL = process.env.CONNECTION_URL || 'postgresql://plane:plane@plane-db:5432/plane';
const PORT = process.env.REPORTER_PORT || 3001;

interface TransactionLogQuery {
  entity_table?: string;
  operation?: string;
  limit?: number;
  offset?: number;
  from_date?: string;
  to_date?: string;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
}

interface TransactionLogResponse {
  id: string;
  created_at: string;
  entity_table: string;
  operation: string;
  before: any;
  after: any;
}

interface StatsResponse {
  total_transactions: number;
  operations: {
    INSERT: number;
    UPDATE: number;
    DELETE: number;
  };
  tables: { [table: string]: number };
  recent_activity: number; // Last 24 hours
}

class TransactionReporterService {
  private app: express.Application;

  constructor() {
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all routes
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Add request logging
    this.app.use((req: Request, res: Response, next: express.NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', this.handleHealthCheck.bind(this));
    
    // Get all transaction logs with filtering and pagination
    this.app.get('/transactions', this.handleGetTransactions.bind(this));
    
    // Get transaction statistics
    this.app.get('/stats', this.handleGetStats.bind(this));
    
    // Get transactions for a specific table
    this.app.get('/transactions/table/:table', this.handleGetTransactionsByTable.bind(this));
    
    // Get transactions by operation type
    this.app.get('/transactions/operation/:operation', this.handleGetTransactionsByOperation.bind(this));
    
    // Get recent transactions (last N hours)
    this.app.get('/transactions/recent/:hours?', this.handleGetRecentTransactions.bind(this));
    
    // Get a specific transaction by ID
    this.app.get('/transactions/:id', this.handleGetTransactionById.bind(this));
    
    // Get table activity summary
    this.app.get('/activity/tables', this.handleGetTableActivity.bind(this));
    
    // Get operation timeline
    this.app.get('/timeline', this.handleGetTimeline.bind(this));

    // Reset database
    this.app.get('/database/reset', this.handleResetDatabase.bind(this));
  }

  /**
   * Health check endpoint
   */
  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      await pgClient.query('SELECT 1');
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all transaction logs with filtering and pagination
   */
  private async handleGetTransactions(req: Request, res: Response): Promise<void> {
    try {
      const query: TransactionLogQuery = req.query as any;
      const {
        entity_table,
        operation,
        limit = 100,
        offset = 0,
        from_date,
        to_date,
        order_by = 'created_at',
        order_direction = 'DESC'
      } = query;

      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramCounter = 1;

      // Build WHERE conditions
      if (entity_table) {
        whereConditions.push(`entity_table = $${paramCounter}`);
        queryParams.push(entity_table);
        paramCounter++;
      }

      if (operation) {
        whereConditions.push(`operation = $${paramCounter}`);
        queryParams.push(operation.toUpperCase());
        paramCounter++;
      }

      if (from_date) {
        whereConditions.push(`created_at >= $${paramCounter}`);
        queryParams.push(from_date);
        paramCounter++;
      }

      if (to_date) {
        whereConditions.push(`created_at <= $${paramCounter}`);
        queryParams.push(to_date);
        paramCounter++;
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const sqlQuery = `
        SELECT id, created_at, entity_table, operation, before, after
        FROM transaction_log
        ${whereClause}
        ORDER BY ${order_by} ${order_direction}
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;

      queryParams.push(limit, offset);

      const result = await pgClient.query(sqlQuery, queryParams);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transaction_log
        ${whereClause}
      `;
      
      const countResult = await pgClient.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total, 10);

      const response = {
        transactions: result.rows,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          has_next: Number(offset) + Number(limit) < total,
          has_prev: Number(offset) > 0
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transaction statistics
   */
  private async handleGetStats(req: Request, res: Response): Promise<void> {
    try {
      // Total transactions
      const totalResult = await pgClient.query(
        'SELECT COUNT(*) as total FROM transaction_log'
      );

      // Operations breakdown
      const operationsResult = await pgClient.query(`
        SELECT operation, COUNT(*) as count
        FROM transaction_log
        GROUP BY operation
      `);

      // Tables breakdown
      const tablesResult = await pgClient.query(`
        SELECT entity_table, COUNT(*) as count
        FROM transaction_log
        GROUP BY entity_table
        ORDER BY count DESC
      `);

      // Recent activity (last 24 hours)
      const recentResult = await pgClient.query(`
        SELECT COUNT(*) as count
        FROM transaction_log
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      const operations = { INSERT: 0, UPDATE: 0, DELETE: 0 };
      operationsResult.rows.forEach(row => {
        operations[row.operation as keyof typeof operations] = parseInt(row.count, 10);
      });

      const tables: { [table: string]: number } = {};
      tablesResult.rows.forEach(row => {
        tables[row.entity_table] = parseInt(row.count, 10);
      });

      const stats: StatsResponse = {
        total_transactions: parseInt(totalResult.rows[0].total, 10),
        operations,
        tables,
        recent_activity: parseInt(recentResult.rows[0].count, 10)
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transactions for a specific table
   */
  private async handleGetTransactionsByTable(req: Request, res: Response): Promise<void> {
    try {
      const { table } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await pgClient.query(`
        SELECT id, created_at, entity_table, operation, before, after
        FROM transaction_log
        WHERE entity_table = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [table, limit, offset]);

      res.json({
        table,
        transactions: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error(`Error fetching transactions for table ${req.params.table}:`, error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transactions by operation type
   */
  private async handleGetTransactionsByOperation(req: Request, res: Response): Promise<void> {
    try {
      const { operation } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await pgClient.query(`
        SELECT id, created_at, entity_table, operation, before, after
        FROM transaction_log
        WHERE operation = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [operation.toUpperCase(), limit, offset]);

      res.json({
        operation: operation.toUpperCase(),
        transactions: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error(`Error fetching transactions for operation ${req.params.operation}:`, error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recent transactions
   */
  private async handleGetRecentTransactions(req: Request, res: Response): Promise<void> {
    try {
      const hours = parseInt(req.params.hours as string) || 24;
      const limit = parseInt(req.query.limit as string) || 100;

      const result = await pgClient.query(`
        SELECT id, created_at, entity_table, operation, before, after
        FROM transaction_log
        WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      res.json({
        hours,
        transactions: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error(`Error fetching recent transactions:`, error);
      res.status(500).json({ 
        error: 'Failed to fetch recent transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific transaction by ID
   */
  private async handleGetTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

        const result = await pgClient.query(`
        SELECT id, created_at, entity_table, operation, before, after
        FROM transaction_log
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching transaction ${req.params.id}:`, error);
      res.status(500).json({ 
        error: 'Failed to fetch transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get table activity summary
   */
  private async handleGetTableActivity(req: Request, res: Response): Promise<void> {
    try {
      const result = await pgClient.query(`
        SELECT 
          entity_table,
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN operation = 'INSERT' THEN 1 END) as inserts,
          COUNT(CASE WHEN operation = 'UPDATE' THEN 1 END) as updates,
          COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as deletes,
          MAX(created_at) as last_activity
        FROM transaction_log
        GROUP BY entity_table
        ORDER BY total_transactions DESC
      `);

      res.json({
        tables: result.rows.map(row => ({
          table: row.entity_table,
          total_transactions: parseInt(row.total_transactions, 10),
          operations: {
            INSERT: parseInt(row.inserts, 10),
            UPDATE: parseInt(row.updates, 10),
            DELETE: parseInt(row.deletes, 10)
          },
          last_activity: row.last_activity
        }))
      });
    } catch (error) {
      console.error('Error fetching table activity:', error);
      res.status(500).json({ 
        error: 'Failed to fetch table activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get operation timeline (grouped by hour)
   */
  private async handleGetTimeline(req: Request, res: Response): Promise<void> {
    try {
      const hours = parseInt(req.query.hours as string) || 24;

      const result = await pgClient.query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as total_operations,
          COUNT(CASE WHEN operation = 'INSERT' THEN 1 END) as inserts,
          COUNT(CASE WHEN operation = 'UPDATE' THEN 1 END) as updates,
          COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as deletes
        FROM transaction_log
        WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
      `);

      res.json({
        timeframe_hours: hours,
        timeline: result.rows.map(row => ({
          hour: row.hour,
          total_operations: parseInt(row.total_operations, 10),
          operations: {
            INSERT: parseInt(row.inserts, 10),
            UPDATE: parseInt(row.updates, 10),
            DELETE: parseInt(row.deletes, 10)
          }
        }))
      });
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ 
        error: 'Failed to fetch timeline',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset database and import fresh data
   */
  private async handleResetDatabase(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Starting database reset process...');
      
      // Call reset and import functions directly
      console.log('♻️  Resetting database...');
      await resetDatabase(pgClient, INSERT_ORDER);
      
      console.log('📥 Importing fresh data...');
      await importData(pgClient, INSERT_ORDER);
      
      // Wait for Kafka consumer to process all CDC messages from import
      console.log('⏳ Waiting for Kafka consumer to process all import messages...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 10 seconds
      
      // Clear transaction log after import to remove setup operations
      console.log('🧹 Clearing transaction log after import...');
      await pgClient.query('TRUNCATE TABLE transaction_log CASCADE;');
      
      console.log('✅ Database reset and import completed successfully');
      
      res.json({
        status: 'success',
        message: 'Database has been reset and fresh data imported',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error during database reset and import:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset and import database',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to PostgreSQL
      await pgClient.connect();
      console.log('✅ Connected to PostgreSQL');

      // Clean up transaction log to remove setup operations
      console.log('🧹 Cleaning up transaction log...');
      try {
        await pgClient.query('TRUNCATE TABLE transaction_log CASCADE;');
        console.log('✅ Transaction log cleaned up');
      } catch (cleanupError) {
        console.log('⚠️  Transaction log cleanup skipped (table may not exist yet)');
      }

      // Start HTTP server
      this.app.listen(PORT, () => {
        console.log(`🚀 Transaction Reporter API running on port ${PORT}`);
        console.log(`📊 API Documentation:`);
        console.log(`   Health Check:       GET  http://localhost:${PORT}/health`);
        console.log(`   All Transactions:   GET  http://localhost:${PORT}/transactions`);
        console.log(`   Statistics:         GET  http://localhost:${PORT}/stats`);
        console.log(`   By Table:           GET  http://localhost:${PORT}/transactions/table/:table`);
        console.log(`   By Operation:       GET  http://localhost:${PORT}/transactions/operation/:operation`);
        console.log(`   Recent:             GET  http://localhost:${PORT}/transactions/recent/:hours`);
        console.log(`   Specific ID:        GET  http://localhost:${PORT}/transactions/:id`);
        console.log(`   Table Activity:     GET  http://localhost:${PORT}/activity/tables`);
        console.log(`   Timeline:           GET  http://localhost:${PORT}/timeline`);
        console.log(`   Reset Database:     GET  http://localhost:${PORT}/database/reset`);
      });
    } catch (error) {
      console.error('❌ Failed to start Transaction Reporter:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    try {
      if (pgClient) {
        await pgClient.end();
        console.log('✅ PostgreSQL connection closed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Create and start the service
const reporterService = new TransactionReporterService();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await reporterService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await reporterService.stop();
  process.exit(0);
});

// Start the service
reporterService.start().catch((error) => {
  console.error('Failed to start reporter service:', error);
  process.exit(1);
});

export default TransactionReporterService;
