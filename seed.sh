#!/bin/bash

# Generate and Import Database Script
# This script runs both data generation and database import in sequence

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if services are running
check_services() {
    print_status "Checking if required services are running..."
    
    # Check if database is running
    if ! docker-compose ps plane-db | grep -q "Up"; then
        print_error "Database is not running. Please run ./setup.sh first."
        exit 1
    fi
    
    # Check if API is running
    if ! docker-compose ps api | grep -q "Up"; then
        print_error "API service is not running. Please run ./setup.sh first."
        exit 1
    fi
    
    print_success "Required services are running"
}

# Function to run generation
run_generation() {
    print_status "Starting data generation process..."
    
    # Build and run the seed-app for generation
    docker-compose run --rm seed-app npm run generate
    
    print_success "Data generation completed!"
}

# Function to run import
run_import() {
    print_status "Starting data import process..."
    
    # Build and run the seed-app for import
    docker-compose run --rm seed-app npm run import
    
    print_success "Data import completed!"
}

run_cdc_setup() {
    print_status "Setting up Kafka CDC..."
    ./setup-kafka-cdc.sh
    
    # Start services
    print_status "Starting Kafka consumer..."
    docker-compose up kafka-consumer -d
    
    sleep 5
    
    print_status "Starting transaction reporter..."
    docker-compose up transaction-reporter -d
    
    # Wait a moment for services to be ready
    sleep 3
    print_success "Kafka CDC setup completed!"
}

# Function to verify generated files
verify_generated_files() {
    print_status "Verifying generated data files..."
    
    # Check if key files exist
    required_files=("issues.json" "projects.json" "states.json" "workspaces.json")
    
    for file in "${required_files[@]}"; do
        if [ ! -f "data/plane/$file" ]; then
            print_error "Required file $file not found in data/plane/"
            exit 1
        fi
    done
    
    print_success "All required data files are present"
}

reset_database() {
    print_status "Resetting database..."
    
    # Stop kafka consumer to prevent logging setup operations
    print_status "Stopping Kafka consumer during reset..."
    docker-compose stop kafka-consumer transaction-reporter || true
    
    # Reset and import data
    docker-compose run --rm seed-app npm run reset
    docker-compose run --rm seed-app npm run import
    
    print_success "Database reset completed!"
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --generate     Full workflow (generate + verify + import + CDC setup)"
    echo "  --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0           # Only reset the database"
    echo "  $0 --generate   # Full workflow (generate + verify + import + CDC setup)"
    echo "  $0 --help    # Show this help"
}

# Main script logic
main() {
    # Parse command line arguments
    case "${1:-}" in
        --generate)
            echo -e "${BLUE}================================${NC}"
            echo -e "${BLUE}    Database Initial Setup ${NC}"
            echo -e "${BLUE}================================${NC}"
            echo ""
            check_services
            run_generation
            verify_generated_files
            run_import
            run_cdc_setup
            echo ""
            print_success "Database initial setup completed successfully!"
            exit 0
            ;;
        --help)
            show_usage
            exit 0
            ;;
        "")
            # Full workflow - no arguments
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac

    # Full workflow
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Database Seeding Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    verify_generated_files
    reset_database
    run_cdc_setup

    echo ""
    print_success "Complete process finished successfully!"
    print_status "Your Plane database is now populated with test data."
}

# Run main function
main "$@" 