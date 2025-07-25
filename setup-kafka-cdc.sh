#!/bin/bash

# Kafka Connect CDC Setup Script
# This script sets up Change Data Capture (CDC) for the Plane database
# using Kafka Connect and Debezium PostgreSQL connector

set -e

# Configuration
POSTGRES_DB=${POSTGRES_DB:-"plane"}
POSTGRES_USER=${POSTGRES_USER:-"plane"}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-"plane"}
KAFKA_CONNECT_URL=${KAFKA_CONNECT_URL:-"http://localhost:8083"}

# Auto-detect the PostgreSQL container name
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep plane-db | head -1)

echo "🚀 Setting up Kafka Connect CDC for Plane database..."

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        
        echo "⏳ Attempt $attempt/$max_attempts: $service_name not ready, waiting..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to become ready after $max_attempts attempts"
    exit 1
}

# Function to check if connector exists
connector_exists() {
    local connector_name=$1
    curl -s "$KAFKA_CONNECT_URL/connectors" | grep -q "\"$connector_name\""
}

# Function to delete existing connector
delete_connector() {
    local connector_name=$1
    echo "🗑️  Deleting existing connector: $connector_name"
    curl -X DELETE "$KAFKA_CONNECT_URL/connectors/$connector_name"
    echo ""
}

# Wait for Kafka Connect to be ready
wait_for_service "$KAFKA_CONNECT_URL/connectors" "Kafka Connect"

# Check if plane-db container is running
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ PostgreSQL container (plane-db) is not running. Please start it first:"
    echo "   docker-compose up plane-db -d"
    exit 1
fi

echo "✅ Found PostgreSQL container: $POSTGRES_CONTAINER"

# Step 1: Set up PostgreSQL publication and replication slot
echo "📝 Setting up PostgreSQL publication for CDC..."

# Create publication for all tables we want to track
docker exec -e PGPASSWORD=$POSTGRES_PASSWORD $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB << EOF
-- Create publication for CDC
DROP PUBLICATION IF EXISTS plane_publication;
CREATE PUBLICATION plane_publication FOR TABLE
  workspaces,
  projects,
  states,
  labels,
  issues,
  cycles,
  modules,
  pages,
  workspace_members,
  project_members,
  issue_assignees,
  module_members,
  project_pages,
  cycle_issues,
  workspace_member_invites,
  issue_views,
  issue_activities,
  issue_subscribers,
  module_issues;

-- Ensure the user has replication privileges
ALTER USER $POSTGRES_USER WITH REPLICATION;

-- Show publication info
\dRp+
EOF

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL publication created successfully"
else
    echo "❌ Failed to create PostgreSQL publication"
    exit 1
fi

# Step 2: Install/Update Kafka Connect connector
echo "🔌 Setting up Kafka Connect connector..."

# Check if connector already exists
if connector_exists "plane-postgres-connector"; then
    echo "⚠️  Connector already exists, deleting it first..."
    delete_connector "plane-postgres-connector"
    sleep 5
fi

# Create the connector
echo "🔧 Creating Kafka Connect connector..."
curl -X POST \
  -H "Content-Type: application/json" \
  --data @kafka-connect-config.json \
  "$KAFKA_CONNECT_URL/connectors"

echo ""

if [ $? -eq 0 ]; then
    echo "✅ Kafka Connect connector created successfully"
else
    echo "❌ Failed to create Kafka Connect connector"
    exit 1
fi

# Step 3: Verify connector status
echo "🔍 Checking connector status..."
sleep 5

curl -s "$KAFKA_CONNECT_URL/connectors/plane-postgres-connector/status" | jq '.'

echo ""
echo "🎉 CDC setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the Kafka consumer: npm run consumer"
echo "2. Or use Docker: docker-compose up kafka-consumer"
echo "3. Monitor the transaction_log table for CDC events"
echo ""
echo "🔧 Useful commands:"
echo "- Check connector status: curl $KAFKA_CONNECT_URL/connectors/plane-postgres-connector/status"
echo "- List topics: docker exec kafka kafka-topics --list --bootstrap-server localhost:9092"
echo "- View connector logs: docker logs kafka-connect"
echo "- Check publication: docker exec -e PGPASSWORD=$POSTGRES_PASSWORD $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -c '\\dRp+'"
echo "- View transaction logs: docker exec -e PGPASSWORD=$POSTGRES_PASSWORD $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT * FROM transaction_log ORDER BY created_at DESC LIMIT 10;'"
echo "" 