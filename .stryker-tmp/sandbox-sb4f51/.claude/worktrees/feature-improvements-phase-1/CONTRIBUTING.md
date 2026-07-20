# Contributing to TaskFlow

Thank you for your interest in contributing to TaskFlow! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/taskflow.git
   cd taskflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run stryker` | Run mutation testing |

## Code Standards

### TypeScript

- Use strict TypeScript with `strict: true`
- Avoid `any` type - use proper types or generics
- Use explicit return types for exported functions
- Use `unknown` instead of `any` for unknown data

### React

- Use functional components with hooks
- Use TypeScript for component props
- Follow the existing component structure
- Use Tailwind CSS for styling

### Code Style

- Use Prettier for consistent formatting
- Use single quotes for strings
- Use destructuring for props
- Use early returns for conditionals

## Testing

### Unit Tests

- Place tests in `src/**/*.test.ts` or `src/**/*.test.tsx`
- Use Vitest as the test framework
- Aim for >90% code coverage
- Test both success and error cases

### Component Tests

- Test component rendering and behavior
- Use React Testing Library
- Mock API calls and external dependencies

### E2E Tests

- Tests in `.e2e/` directory
- Test critical user flows
- Run manually or before releases

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code standards
   - Add/update tests
   - Update documentation

3. **Run checks**
   ```bash
   npm run lint
   npm run test
   npm run format:check
   ```

4. **Commit changes**
   - Use clear, descriptive commit messages
   - Reference issues in commit messages

5. **Push and create PR**
   - Push to your fork/branch
   - Create a pull request against `main`

## Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- Example: `feat(tasks): add task filtering by priority`

## Getting Help

- Open an issue for bugs or feature requests
- Join our Discord/GitLab for discussions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.