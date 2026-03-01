# Event Canvas Art

A modern, interactive event canvas art application built with TypeScript, React, and Tailwind CSS.

## About

Event Canvas Art is a web application designed to create, manage, and display interactive canvas-based artwork for events. The project uses a full-stack approach with a React frontend and database backend.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A PostgreSQL database (optional, for full backend functionality)

### Installation

Follow these steps to set up the project locally:

```sh
# Step 1: Clone the repository
git clone https://github.com/Horlixs/event-canvas-art.git

# Step 2: Navigate to the project directory
cd event-canvas-art

# Step 3: Install dependencies
npm i

# Step 4: Set up environment variables (if needed)
# Create a .env file and add your configuration

# Step 5: Start the development server
npm run dev
```

The application will be available at `http://localhost:5173` (or your configured port).

## Technologies Used

This project is built with:

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn-ui
- **Database**: PostgreSQL (PLpgSQL)
- **Languages**: TypeScript, JavaScript, HTML, CSS

## Development

### Available Scripts

```sh
# Start development server with hot module reloading
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting (if configured)
npm run lint
```

### Project Structure

```
event-canvas-art/
├── src/              # Source code
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── styles/       # CSS and styling
│   └── utils/        # Utility functions
├── public/           # Static assets
├── index.html        # HTML entry point
└── vite.config.ts    # Vite configuration
```

## Editing Code

### Option 1: Use Your IDE

Clone the repository and edit files locally with your preferred code editor. Push your changes back to GitHub.

### Option 2: Edit on GitHub

1. Navigate to the file you want to edit
2. Click the pencil icon (Edit) in the top right
3. Make your changes and commit

### Option 3: Use GitHub Codespaces

1. Go to your repository's main page
2. Click the green "Code" button
3. Select the "Codespaces" tab
4. Click "New codespace"
5. Edit files and commit your changes

## Deployment

### Deploy to Production

Choose your preferred hosting platform:

- **Vercel**: Connect your GitHub repo for automatic deployments
- **Netlify**: Similar GitHub integration with zero-config builds
- **GitHub Pages**: For static sites with `npm run build`
- **Traditional Hosting**: Build locally and upload the `dist/` folder

### Build for Production

```sh
npm run build
```

This creates an optimized production build in the `dist/` folder.

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source. Check the LICENSE file for details.

## Support

For issues, questions, or feedback, please open an [issue](https://github.com/Horlixs/event-canvas-art/issues) on GitHub.

---

Last updated: March 2026