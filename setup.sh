#!/bin/bash

# Seed App Setup Script
# This script sets up the complete Plane app with database seeding

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to clean up existing containers and volumes
cleanup() {
    print_status "Cleaning up existing Docker resources..."
    
    # Stop and remove containers, networks, and volumes
    docker-compose down -v 2>/dev/null || true
    
    # Remove seed-app images
    docker rmi seed-app-seed-app:latest 2>/dev/null || true
    docker rmi plane-app-seed-app:latest 2>/dev/null || true
    
    # Clean up dangling resources
    docker system prune -f
    
    print_success "Cleanup completed"
}

# Function to start database and run migrations
setup_database() {
    print_status "Starting database and running migrations..."
    
    # Start database and redis
    docker-compose up plane-db plane-redis -d
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start migrator
    docker-compose up migrator -d
    
    # Wait for migrations to complete
    print_status "Waiting for migrations to complete..."
    sleep 30
    
    # Check if migrations completed successfully
    if docker-compose ps migrator | grep -q "Up"; then
        print_warning "Migrations are still running, waiting a bit more..."
        sleep 30
    fi
    
    print_success "Database setup completed"
}

start_kafka() {
    print_status "Starting Kafka and connector..."
    docker-compose up zookeeper kafka kafka-connect -d
    sleep 20
    # Setup test connector
    print_success "Kafka and connector started"
}

# Function to start all Plane app services
start_plane_app() {
    print_status "Starting Plane app services..."
    
    # Start infrastructure services
    docker-compose up plane-mq plane-minio -d
    
    # Wait for infrastructure to be ready
    sleep 10
    
    # Start backend services
    docker-compose up api worker live -d
    
    # Wait for backend to be ready
    sleep 15
    
    # Start frontend services
    docker-compose up web space admin -d
    
    # Wait for frontend to be ready
    sleep 10
    
    # Start proxy
    docker-compose up proxy -d
    
    print_success "Plane app services started"
}

# Function to verify all services are running
verify_services() {
    print_status "Verifying all services are running..."
    
    # Wait a bit for all services to stabilize
    sleep 10
    
    # Check service status
    local failed_services=()
    
    # List of services to check
    services=("plane-db" "plane-redis" "plane-mq" "plane-minio" "api" "worker" "live" "web" "space" "admin" "proxy")
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        print_success "All services are running successfully!"
        echo ""
        echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
        echo ""
        echo -e "${BLUE}Access Points:${NC}"
        echo -e "  • Plane App: ${GREEN}http://localhost:80${NC}"
        echo -e "  • Database: ${GREEN}localhost:5433${NC}"
        echo -e "  • MinIO Console: ${GREEN}http://localhost:9000${NC}"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo -e "  1. Open your browser and go to ${GREEN}http://localhost:80${NC}"
        echo -e "  2. Create a new user through the Plane UI"
        echo -e "  3. Once you have a user, run: ${GREEN}docker-compose up seed-app${NC}"
        echo ""
    else
        print_error "Some services failed to start: ${failed_services[*]}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo -e "  1. Check logs: ${GREEN}docker-compose logs${NC}"
        echo -e "  2. Restart specific service: ${GREEN}docker-compose restart <service-name>${NC}"
        echo -e "  3. Try running the script again"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --cleanup-only    Only clean up Docker resources"
    echo "  --db-only         Only set up database and migrations"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0               # Full setup (cleanup + database + app)"
    echo "  $0 --cleanup-only # Only cleanup"
    echo "  $0 --db-only     # Only setup database"
}

# Main script logic
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    Seed App Setup Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    # Parse command line arguments
    case "${1:-}" in
        --cleanup-only)
            check_docker
            cleanup
            print_success "Cleanup completed"
            exit 0
            ;;
        --db-only)
            check_docker
            cleanup
            setup_database
            print_success "Database setup completed"
            exit 0
            ;;
        --help)
            show_usage
            exit 0
            ;;
        "")
            # Full setup
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
    
    # Full setup process
    check_docker
    cleanup
    setup_database
    start_kafka
    start_plane_app
    verify_services
}

# Run main function with all arguments
main "$@" 