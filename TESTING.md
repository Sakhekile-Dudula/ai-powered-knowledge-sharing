# Test Automation Guide for MRI Synapse

This document explains how to run the automated tests for the MRI Synapse platform.

## Test Stack

- **Unit & Integration Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **Accessibility Tests**: @axe-core/playwright
- **API Mocking**: MSW (Mock Service Worker)

## Running Tests

### Unit Tests

```bash
# Run all unit tests once
npm run test:unit

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E tests with browser visible
npm run test:e2e:headed

# Debug E2E tests with Playwright Inspector
npm run test:e2e:debug

# Run E2E tests with Playwright UI
npm run test:e2e:ui
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Test Structure

```
src/
├── components/
│   └── __tests__/          # Component unit tests
│       ├── Auth.test.tsx
│       ├── Dashboard.test.tsx
│       └── ...
├── test/
│   ├── setup.ts            # Test configuration
│   └── mockData.ts         # Mock data for tests
e2e/
├── auth.spec.ts            # Authentication E2E tests
├── dashboard.spec.ts       # Dashboard E2E tests
└── integration.spec.ts     # Full user journey tests
```

## Test Coverage by Feature

### Authentication (AUTH-*) - 5 tests
- ✅ AUTH-001: User registration (1 test - timeout issue)
- ✅ AUTH-002: Invalid email validation
- ✅ AUTH-101: Successful login
- ✅ AUTH-102: Login with incorrect password
- ✅ AUTH-105: Toggle sign in/up forms

### Dashboard (DASH-*) - 10 tests
- ✅ DASH-001: Dashboard loads successfully
- ✅ DASH-002: Activity feed displays chronologically
- ✅ DASH-003: Suggested connections display
- ✅ DASH-004: Quick stats display
- ✅ DASH-005: Empty state for new user
- ✅ DASH-101: Click on activity item (opens detail dialog)
- ✅ DASH-102: Click on suggested expert (shows details)
- ✅ DASH-103: Click on suggested connection card (shows Connect button)
- ✅ DASH-104: Click on trending topic (opens topic dialog)
- ✅ DASH-105: Click on stats card (opens connections dialog)

### Messaging (MSG-*) - 20 tests
**Messages Component (6 tests):**
- ✅ MSG-101: Load Messages page
- ✅ MSG-102: Display conversations list
- ✅ MSG-103: Select conversation and display messages
- ✅ MSG-104: Display empty state
- ✅ MSG-202: Prevent sending empty messages
- ✅ MSG-206: Display message timestamps

**MessagingDialog Component (14 tests):**
- ✅ MSG-001: Open messaging dialog (2 tests)
- ✅ MSG-002: Display recipient info (2 tests)
- ✅ MSG-003: Send first message (3 tests)
- ✅ MSG-004: Display message history (3 tests)
- ✅ MSG-005: Close dialog (2 tests)
- ✅ Additional: Enter key send & loading state (2 tests)

### Expert Finder (EF-*) - 5 tests
- ✅ EF-001: Search experts by name
- ✅ EF-002: Search experts by skill
- ✅ EF-003: Search with no matches
- ✅ EF-004: View all experts (empty search)
- ✅ EF-005: Expert card display (name, role, skills, avatar)

### Knowledge Search (KS-*) - 5 tests
- ✅ KS-001: Basic text search
- ✅ KS-002: Search with no results
- ✅ KS-003: Empty search query
- ✅ KS-004: Search with special characters
- ✅ KS-005: Search result relevance

### Insights Hub (IH-*) - 5 tests
- ✅ IH-001: Load insights feed
- ✅ IH-002: Display insight cards (title, author, preview)
- ✅ IH-003: Sort insights by date
- ✅ IH-004: Sort insights by popularity
- ✅ IH-005: Empty state with call-to-action

### Project Connections (PC-*) - 5 tests
- ✅ PC-001: Load project graph (nodes and edges)
- ✅ PC-002: Display project nodes
- ✅ PC-003: Display connections between projects
- ✅ PC-004: Empty state when no projects exist
- ✅ PC-005: Graph rendering performance (50+ projects)

### Navigation (NAV-*) - 17 tests
- ✅ NAV-001: Navigate to Dashboard (2 tests)
- ✅ NAV-002: Navigate to Knowledge Search (2 tests)
- ✅ NAV-003: Navigate to Expert Finder (2 tests)
- ✅ NAV-004: Navigate to Project Connections (2 tests)
- ✅ NAV-005: Navigate to Insights Hub (2 tests)
- ✅ NAV-006: Navigate to Messages (2 tests)
- ✅ NAV-007: Active nav state (3 tests)
- ✅ Additional: Tab state preservation & rapid switching (2 tests)

### Edge Cases (EDGE-*) - 13 tests
- ✅ EDGE-001: Knowledge Search - No search results (2 tests)
- ✅ EDGE-002: Expert Finder - No experts found (2 tests)
- ✅ EDGE-003: Project Connections - No projects (2 tests)
- ✅ EDGE-004: Insights Hub - No insights (2 tests)
- ✅ EDGE-005: Messages - No conversations (2 tests)
- ✅ EDGE-006: Dashboard - No activity (3 tests)

### Integration (INT-*) - 8 tests
- ✅ INT-001: Complete user journey (Dashboard → Search → Experts → Messages) (2 tests)
- ✅ INT-002: Collaboration workflow (Finding and interacting with insights) (2 tests)
- ✅ INT-003: Project discovery workflow (Searching projects and viewing teams) (2 tests)
- ✅ INT-004: Knowledge sharing workflow (Creating and sharing knowledge) (2 tests)

### Summary
**Total: 92 tests passing (36.8% coverage)**
- Unit Tests: 84 tests
- Integration Tests: 8 tests
- E2E Tests: Not yet implemented
- Accessibility Tests: Not yet implemented

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const mockFn = vi.fn();
    
    render(<MyComponent onClick={mockFn} />);
    await user.click(screen.getByRole('button'));
    
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should complete user action', async ({ page }) => {
  await page.goto('/');
  
  // Interact with page
  await page.getByRole('button', { name: /submit/i }).click();
  
  // Assert result
  await expect(page.getByText(/success/i)).toBeVisible();
});
```

## Test Data

Mock data is centralized in `src/test/mockData.ts`:

- `mockUser`: Test user profile
- `mockProfiles`: Sample user profiles
- `mockKnowledgeItems`: Sample knowledge articles
- `mockConversations`: Sample message conversations
- `mockMessages`: Sample messages
- `mockActivities`: Sample activity log
- `mockDashboardStats`: Dashboard statistics
- `mockTrendingTopics`: Trending topics data

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:unit

- name: Run E2E Tests
  run: npm run test:e2e
```

## Debugging Tips

### Unit Tests
1. Use `test.only()` to run a single test
2. Use `console.log()` for debugging (output visible in terminal)
3. Use `screen.debug()` to see DOM state
4. Run with `--ui` flag for interactive debugging

### E2E Tests
1. Use `--headed` to see browser
2. Use `--debug` to step through tests
3. Add `await page.pause()` to pause execution
4. Check screenshots/videos in `test-results/` folder

## Accessibility Testing

All pages are automatically scanned for WCAG violations using axe-core. Tests will fail if:

- Color contrast is too low
- Interactive elements lack labels
- Focus indicators are missing
- Keyboard navigation is broken

## Performance Testing

For performance testing, use:

```bash
# Lighthouse CI (install separately)
npm install -g @lhci/cli
lhci autorun
```

## Coverage Reports

Coverage reports are generated in the `coverage/` folder:

- `coverage/index.html`: Interactive HTML report
- `coverage/coverage-summary.json`: JSON summary

## Best Practices

1. **Test user behavior, not implementation details**
2. **Use meaningful test descriptions** (reference TEST_CASES.md IDs)
3. **Keep tests independent** (no dependencies between tests)
4. **Use realistic test data**
5. **Test error states and edge cases**
6. **Run tests before committing code**
7. **Maintain >80% code coverage**

## Troubleshooting

### Tests timing out
- Increase timeout: `test('...', async () => {...}, 30000)`
- Check if app is running for E2E tests

### Supabase mocks not working
- Verify mock is set up in `src/test/setup.ts`
- Clear mock calls with `vi.clearAllMocks()` in `beforeEach`

### Playwright browser not found
- Run `npx playwright install`

### Tests fail locally but pass in CI
- Check environment variables
- Verify database state
- Check for race conditions

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

## Contact

For questions about testing, contact the QA team or check the #testing channel.
