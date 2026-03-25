#!/bin/bash
# =============================================
# SPS Property - Deploy Script
# =============================================
# 
# Usage:
#   ./scripts/deploy.sh              # Deploy everything (SSG + Build + Deploy)
#   ./scripts/deploy.sh --ssg-only   # Only generate static pages
#   ./scripts/deploy.sh --build-only # Only build without SSG
#   ./scripts/deploy.sh --deploy-only # Only deploy existing dist folder
#
# Prerequisites:
#   1. Firebase CLI: npm install -g firebase-tools
#   2. Login: firebase login
#   3. Already in project directory
#
# =============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm: $(npm --version)"
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        log_warn "Firebase CLI not found. Installing..."
        npm install -g firebase-tools
    fi
    log_success "Firebase CLI: $(firebase --version)"
    
    # Check service account
    if [ ! -f "$PROJECT_DIR/firebase-service-account.json" ]; then
        log_warn "Service account not found at firebase-service-account.json"
        log_info "Download from: Firebase Console > Project Settings > Service Accounts > Generate new private key"
        log_info "Save as: $PROJECT_DIR/firebase-service-account.json"
    else
        log_success "Service account: Found"
    fi
    
    # Check dist folder
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        log_warn "dist folder not found. Will build first."
    else
        log_success "dist folder: Found ($(du -sh "$PROJECT_DIR/dist" | cut -f1))"
    fi
}

deploy_ssg() {
    log_info "Generating SSG static pages..."
    
    export GOOGLE_APPLICATION_CREDENTIALS="$PROJECT_DIR/firebase-service-account.json"
    
    node scripts/generate-static-pages.js
    
    log_success "SSG completed!"
}

deploy_build() {
    log_info "Building Vite project..."
    
    npm run build
    
    log_success "Build completed!"
}

deploy_firebase() {
    log_info "Deploying to Firebase Hosting..."
    
    # Check if firebase.json exists
    if [ ! -f "$PROJECT_DIR/firebase.json" ]; then
        log_error "firebase.json not found!"
        exit 1
    fi
    
    # Deploy to Firebase
    firebase deploy --only hosting --project sps-property
    
    log_success "Deployed to Firebase Hosting!"
}

# Main
show_banner() {
    echo ""
    echo "============================================="
    echo "  🏠 SPS Property - Deploy Script"
    echo "============================================="
    echo ""
}

show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --all          Full deploy: SSG + Build + Deploy (default)"
    echo "  --ssg-only     Only generate SSG pages"
    echo "  --build-only   Only build Vite (no SSG)"
    echo "  --deploy-only  Only deploy to Firebase"
    echo "  --help         Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full deploy"
    echo "  $0 --ssg-only         # Generate SSG only"
    echo "  $0 --deploy-only      # Deploy existing build"
    echo ""
}

# Parse arguments
MODE="${1:-all}"

case "$MODE" in
    --all|-a)
        MODE="all"
        ;;
    --ssg-only|-s)
        MODE="ssg-only"
        ;;
    --build-only|-b)
        MODE="build-only"
        ;;
    --deploy-only|-d)
        MODE="deploy-only"
        ;;
    --help|-h)
        show_banner
        show_usage
        exit 0
        ;;
    *)
        log_error "Unknown option: $MODE"
        show_usage
        exit 1
        ;;
esac

# Main execution
show_banner

case "$MODE" in
    all)
        check_prerequisites
        deploy_ssg
        deploy_build
        deploy_firebase
        ;;
    ssg-only)
        check_prerequisites
        deploy_ssg
        ;;
    build-only)
        check_prerequisites
        deploy_build
        ;;
    deploy-only)
        check_prerequisites
        deploy_firebase
        ;;
esac

echo ""
log_success "🎉 All done!"
echo ""
