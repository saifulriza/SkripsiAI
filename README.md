# Thesis Consultation System

A modern web application for managing thesis consultations between students and lecturers.

## Features

- 🔐 Authentication system with login and registration
- 👥 Different dashboards for students and lecturers
- 📝 Thesis management and exploration
- 💬 AI-powered assistance
- 🌐 Multilingual support (English and Indonesian)
- 📱 Responsive design with Quasar Framework

## Tech Stack

- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Quasar Framework](https://quasar.dev/) - Vue.js based framework
- [Pinia](https://pinia.vuejs.org/) - State management
- [Vue Router](https://router.vuejs.org/) - Official router for Vue.js
- [Vue I18n](https://vue-i18n.intlify.dev/) - Internationalization
- [Supabase](https://supabase.com/) - Backend and Authentication
- [OpenAI](https://openai.com/) - AI Integration
- [Axios](https://axios-http.com/) - HTTP client

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
yarn
# or
npm install
```

3. Set up environment variables (create .env file based on .env.example)

4. Start development server:

```bash
yarn dev
# or
npm run dev
# or
quasar dev
```

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn lint` - Lint files
- `yarn format` - Format files with Prettier

## Project Structure

- `/src/pages` - Application views
- `/src/components` - Reusable Vue components
- `/src/layouts` - Page layouts
- `/src/router` - Route configurations
- `/src/stores` - Pinia state management
- `/src/boot` - Boot files (Axios, i18n, etc.)
- `/src/i18n` - Translation files
- `/src/services` - API services

## Building for Production

```bash
yarn build
# or
npm run build
# or
quasar build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
