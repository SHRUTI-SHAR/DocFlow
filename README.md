# Simplify - Document Processing Application

A modern React application for intelligent document processing, template matching, and form generation built with TypeScript, Supabase, and advanced AI capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd simplifyai-docflow
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

4. **Configure environment variables**
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Configuration
VITE_DOCUMENT_ANALYSIS_BACKEND=supabase
VITE_FASTAPI_URL=http://localhost:8000
VITE_MAX_PAYLOAD_SIZE=10000000
```

5. **Start development server**
```bash
npm run dev
```

## 📋 Features

- **AI Document Analysis** - Intelligent text extraction and field detection
- **Template Matching** - Automatic document template recognition 
- **Form Generation** - Dynamic form creation from templates
- **Workflow Management** - Customizable document processing workflows
- **Smart Organization** - AI-powered document categorization and search
- **Multi-format Support** - PDF, images, and various document formats
- **Real-time Processing** - Live document processing with progress tracking

## 📚 Documentation

For comprehensive developer documentation, see:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System architecture and design patterns
- [`docs/COMPONENTS.md`](docs/COMPONENTS.md) - Component documentation and usage examples
- [`docs/API.md`](docs/API.md) - API endpoints and integration guide
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) - Development setup and workflow

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── services/           # Business logic and API calls
├── contexts/           # React context providers
├── types/              # TypeScript type definitions
├── constants/          # Application constants
└── integrations/       # Third-party integrations
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Production
Simply open your deployment platform and connect this repository, or use the built-in deployment features in your development environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.