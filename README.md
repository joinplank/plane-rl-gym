# Seed App - Database Seeding for Plane

A comprehensive database seeding application for the Plane project management platform. This application generates realistic synthetic data for testing and development purposes.

## 📝 Quick Reference

**Complete Setup in 4 Steps:**
1. `./setup.sh` - Start all Plane services
2. Create user account at http://localhost:80
3. Update `data/plane/users.json` with your user details
4. `./seed.sh` - Generate and import test data

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git
- OpenAI API key (for data generation)

### Complete Setup Process

Follow these 4 steps to get the Plane app running with seeded data:

#### Step 1: Run Initial Setup
```bash
# Clone the repository
git clone https://github.com/joinplank/seed-app.git
cd seed-app

# Run the setup script to start all services
./setup.sh
```

This will:
- Clean up any existing Docker resources
- Start the database and run migrations
- Start all Plane app services
- Verify everything is running correctly

#### Step 2: Create a User Account
Open http://localhost:80 in your browser and create a user account through the Plane UI. This user will be used as the base for generating seed data.

#### Step 3: Update User Configuration
After creating your account, update the user information in the seed data:
```bash
# Edit the users.json file with your actual user details
nano data/plane/users.json
# or
vim data/plane/users.json
```

Replace the placeholder user data with the actual user ID and details from the account you created in Step 2.

#### Step 4: Run Database Seeding
```bash
# Generate and import seed data
./seed.sh
```

This will generate realistic test data for your Plane instance.

### Environment Configuration

Create a `plane.env` file with your OpenAI API key:
```bash
# Create environment file
cp plane.env.example plane.env

# Add your OpenAI API key
echo "OPENAI_API_KEY=your_openai_api_key_here" >> plane.env
```

## 📋 Manual Setup (Advanced)

If you prefer to run commands manually or need more control:

### 1. Clean up existing resources
```bash
docker-compose down -v
docker system prune -f
```

### 2. Start database and migrations
```bash
docker-compose up plane-db plane-redis -d
sleep 10
docker-compose up migrator -d
```

### 3. Start Plane app services
```bash
docker-compose up plane-mq plane-minio -d
docker-compose up api worker live -d
docker-compose up web space admin -d
docker-compose up proxy -d
```

### 4. Follow steps 2-4 from the Quick Start guide

## 🌱 Database Seeding Operations

After completing the initial setup, you can perform additional seeding operations:

### Re-running Seeding
```bash
# Full seeding workflow (generate + reset + import)
./seed.sh

# Reset database only (clear all data)
./seed.sh --reset

# Show available options
./seed.sh --help
```

### Database Reset

The seeding process now includes automatic database reset to ensure clean state on each run. You can also reset the database independently:

```bash
# Using the seed script (recommended)
./seed.sh --reset       # Reset database only (clears all seeded data)

# Using Docker directly  
docker-compose run --rm seed-app npm run reset

# Other operations
docker-compose run --rm seed-app npm run generate  # Generate new data only
docker-compose run --rm seed-app npm run import    # Import data (with automatic reset)
docker-compose run --rm seed-app npm run seed      # Full workflow: generate + import
```

## 🔄 Kafka Consumer Service for Change Data Capture (CDC)

The application includes a standalone Kafka consumer service that listens to database changes via Kafka Connect and Debezium, storing transaction logs for audit and monitoring purposes.

### Features

- **Real-time CDC**: Captures INSERT, UPDATE, and DELETE operations
- **Transaction Logging**: Stores before/after states in `transaction_log` table
- **Standalone Service**: Runs independently of the main Plane application
- **Graceful Shutdown**: Handles SIGTERM and SIGINT signals properly
- **Error Handling**: Robust error handling with detailed logging

### Setup CDC

1. **Start all services including Kafka infrastructure**:
   ```bash
   docker-compose up -d
   ```

2. **Configure Kafka Connect with Debezium**:
   ```bash
   ./setup-kafka-cdc.sh
   ```

3. **Start the Kafka consumer**:
   ```bash
   # Using npm
   npm run consumer

   # Using Docker (recommended)
   docker-compose up kafka-consumer
   ```

### Manual Configuration

If you prefer manual setup:

1. **Create PostgreSQL publication**:
   ```sql
   CREATE PUBLICATION plane_publication FOR ALL TABLES;
   ALTER USER plane WITH REPLICATION;
   ```

2. **Install Kafka Connect connector**:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data @kafka-connect-config.json \
     http://localhost:8083/connectors
   ```

### Environment Variables for Kafka Consumer

```env
# Kafka Configuration
KAFKA_BROKER=kafka:9092
KAFKA_GROUP_ID=plane-cdc-consumer
KAFKA_CLIENT_ID=plane-cdc-client

# Database connection (same as seeding)
CONNECTION_URL=postgresql://plane:plane@plane-db:5432/plane
```

### Monitoring CDC

- **Check connector status**: `curl http://localhost:8083/connectors/plane-postgres-connector/status`
- **List Kafka topics**: `docker exec kafka-connect /kafka/bin/kafka-topics.sh --list --bootstrap-server kafka:9092`
- **View transaction logs**: Query the `transaction_log` table or use the Reporter API
- **Consumer logs**: `docker-compose logs kafka-consumer`
- **Reporter API logs**: `docker-compose logs transaction-reporter`

### Transaction Log Schema

The `transaction_log` table stores:

```sql
CREATE TABLE transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_table VARCHAR(255) NOT NULL, -- Table name from CDC event
  operation VARCHAR(10),               -- 'INSERT', 'UPDATE', 'DELETE'
  before JSONB DEFAULT 'null',         -- Row state before change
  after JSONB DEFAULT 'null'           -- Row state after change
);
```

## 📊 Transaction Reporter API

The application includes a REST API service for querying and analyzing transaction logs captured by the CDC system. This provides comprehensive endpoints for monitoring database changes, generating statistics, and analyzing patterns.

### Features

- **Comprehensive Querying**: Filter by table, operation, date range with pagination
- **Real-time Statistics**: Operations breakdown, table activity, recent activity metrics
- **Timeline Analysis**: Hourly operation trends and activity patterns
- **CORS Enabled**: Ready for frontend integration
- **Health Monitoring**: Built-in health check endpoints

### Start the Reporter API

1. **Using Docker Compose (recommended)**:
   ```bash
   docker-compose up transaction-reporter -d
   ```

2. **Using npm directly**:
   ```bash
   npm run reporter
   ```

3. **Development mode with auto-reload**:
   ```bash
   npm run reporter:dev
   ```

### API Endpoints

The Transaction Reporter API runs on port 3001 and provides the following endpoints:

#### Core Endpoints

- **Health Check**: `GET /health`
  - Check API and database connectivity
  
- **All Transactions**: `GET /transactions`
  - Get paginated transaction logs with filtering
  - Query parameters: `entity_table`, `operation`, `limit`, `offset`, `from_date`, `to_date`, `order_by`, `order_direction`
  
- **Statistics**: `GET /stats`
  - Get comprehensive statistics (total transactions, operations breakdown, table activity)

#### Filtering Endpoints

- **By Table**: `GET /transactions/table/:table`
  - Get transactions for a specific database table
  - Example: `/transactions/table/workspaces`
  
- **By Operation**: `GET /transactions/operation/:operation`
  - Get transactions by operation type (INSERT/UPDATE/DELETE)
  - Example: `/transactions/operation/INSERT`
  
- **Recent Activity**: `GET /transactions/recent/:hours?`
  - Get transactions from the last N hours (default: 24)
  - Example: `/transactions/recent/6`

#### Analysis Endpoints

- **Specific Transaction**: `GET /transactions/:id`
  - Get detailed information for a specific transaction ID
  
- **Table Activity**: `GET /activity/tables`
  - Get activity summary for all monitored tables
  
- **Timeline**: `GET /timeline?hours=24`
  - Get hourly operation timeline for trend analysis

### API Usage Examples

```bash
# Get recent transactions
curl http://localhost:3001/transactions/recent/1

# Get statistics
curl http://localhost:3001/stats

# Get workspace transactions with pagination
curl "http://localhost:3001/transactions/table/workspaces?limit=10&offset=0"

# Get all INSERT operations
curl http://localhost:3001/transactions/operation/INSERT

# Get transactions with date filtering
curl "http://localhost:3001/transactions?from_date=2024-01-01&to_date=2024-01-31"

# Get hourly timeline for last 12 hours
curl "http://localhost:3001/timeline?hours=12"
```

### API Response Examples

**Statistics Response**:
```json
{
  "total_transactions": 150,
  "operations": {
    "INSERT": 75,
    "UPDATE": 50,
    "DELETE": 25
  },
  "tables": {
    "workspaces": 30,
    "projects": 45,
    "issues": 75
  },
  "recent_activity": 12
}
```

**Transaction Response**:
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-20T10:30:00Z",
      "entity_table": "workspaces",
      "operation": "INSERT",
      "before": null,
      "after": {
        "id": "...",
        "name": "New Workspace",
        "slug": "new-workspace"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "has_next": true,
    "has_prev": false
  }
}
```

### Environment Variables for Reporter API

```env
# Database connection (same as CDC consumer)
CONNECTION_URL=postgresql://plane:plane@plane-db:5432/plane

# API server port
REPORTER_PORT=3001
```

### Integration with Frontend

The API is CORS-enabled and ready for frontend integration. Example JavaScript usage:

```javascript
// Fetch recent transactions
const response = await fetch('http://localhost:3001/transactions/recent/1');
const data = await response.json();

// Get statistics for dashboard
const stats = await fetch('http://localhost:3001/stats');
const statsData = await stats.json();

// Real-time monitoring
setInterval(async () => {
  const activity = await fetch('http://localhost:3001/activity/tables');
  updateDashboard(await activity.json());
}, 30000); // Update every 30 seconds
```

## 📁 Project Structure

```
seed-app/
├── src/                    # TypeScript source code
│   ├── client.ts          # Database and OpenAI clients
│   ├── config.ts          # Seeding configuration
│   ├── constants.ts       # Data generation constants
│   ├── generators.ts      # Data generation functions
│   ├── healthCheck.ts     # Health monitoring for CDC services
│   ├── helpers.ts         # Utility functions
│   ├── index.ts           # Main seeding logic
│   ├── kafkaConsumer.ts   # Kafka CDC consumer service
│   ├── reporter.ts        # Transaction log Reporter API
│   ├── tableOrder.ts      # Database table dependencies
│   └── types.ts           # TypeScript type definitions
├── data/                  # Generated data files
├── docker-compose.yaml    # Complete Plane app + CDC + API setup
├── Dockerfile            # Container configuration
├── kafka-connect-config.json # Debezium connector configuration
├── setup-kafka-cdc.sh    # CDC setup automation script
├── setup.sh              # Automated setup script
├── seed.sh               # Generate and import execution script
├── verify-topics.sh      # Kafka topics verification script
└── package.json          # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
# Database connection
CONNECTION_URL=postgresql://plane:plane@plane-db:5432/plane

# OpenAI API key for data generation
OPENAI_API_KEY=your_openai_api_key_here
```

### Seeding Configuration

Modify `src/config.ts` to customize:

- Number of records per table
- Data generation strategies
- Table dependencies and order

## 🎯 Features

- **Realistic Data**: Uses OpenAI to generate realistic project names, descriptions, and content
- **Proper Dependencies**: Respects foreign key constraints and table relationships
- **Customizable**: Easy to modify data generation rules and quantities
- **Docker Integration**: Seamless integration with Plane app Docker setup
- **User Integration**: Uses existing users from the Plane app

## 🛠️ Scripts

### Setup Script (`./setup.sh`)

```bash
./setup.sh              # Full setup
./setup.sh --cleanup-only # Only cleanup Docker resources
./setup.sh --db-only     # Only setup database
./setup.sh --help        # Show help
```

### Seeding Script (`./seed.sh`)

```bash
./seed.sh               # Run full database seeding workflow
./seed.sh --reset       # Reset database only (clear all data)
./seed.sh --help        # Show usage information
```

### NPM Scripts

```bash
npm run generate        # Generate seed data files only
npm run import          # Import data to database (with reset)
npm run reset           # Reset database only (clear all data)
npm run seed            # Generate + import (full workflow)
```

## 🌐 Access Points

After setup, access the application at:

- **Plane App**: http://localhost:80
- **Database**: localhost:5433
- **MinIO Console**: http://localhost:9000
- **Kafka Connect REST API**: http://localhost:8083
- **Transaction Reporter API**: http://localhost:3001
- **Kafka Topics**: kafka:9092 (internal Docker network)

## 🔍 Troubleshooting

### Common Issues

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Step 1 Issues (Setup Script)
- **Port conflicts**: Ensure ports 80 and 5433 are available
- **Docker not running**: Start Docker Desktop before running `./setup.sh`
- **Services not starting**: Check logs with `docker-compose logs <service-name>`
- **Previous installation conflicts**: Run `./setup.sh --cleanup-only` first

#### Step 2 Issues (User Creation)
- **Can't access http://localhost:80**: Wait a few minutes for all services to start
- **Plane UI not loading**: Check if proxy service is running with `docker-compose ps proxy`
- **Database connection errors**: Ensure database migrations completed successfully

#### Step 3 Issues (User Configuration)
- **users.json file not found**: Create the directory `mkdir -p data/plane` and add your user data
- **User ID format**: Ensure you're using the correct UUID format from your Plane account
- **File permissions**: Ensure the file is readable: `chmod 644 data/plane/users.json`

#### Step 4 Issues (Seeding)
- **OPENAI_API_KEY not set**: Create `plane.env` file with your OpenAI API key
- **Seeding fails**: Ensure you've created a user in the Plane UI first and updated users.json
- **Container rebuild needed**: Run `docker-compose build seed-app` after code changes

### General Issues

### Useful Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs

# View specific service logs
docker-compose logs kafka-consumer
docker-compose logs transaction-reporter

# Restart specific service
docker-compose restart <service-name>

# Test Reporter API health
curl http://localhost:3001/health

# Get CDC statistics
curl http://localhost:3001/stats

# Clean up everything
./setup.sh --cleanup-only
```

## 📊 Generated Data

The seeding process creates:

- **Workspaces**: 1 workspace
- **Projects**: 18 projects per workspace
- **States**: 62 states per project
- **Labels**: 3 labels per project
- **Issues**: 50 issues per project
- **Cycles**: 18 cycles per project
- **Modules**: 18 modules per project
- **Pages**: 18 pages per project
- **And more**: Members, assignments, activities, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `./setup.sh`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
