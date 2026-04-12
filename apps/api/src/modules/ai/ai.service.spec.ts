import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { DRIZZLE } from '../../database/database.module';

/**
 * AI Service regression tests.
 * Ensures pageContextMap coverage, action types, and prompt structure
 * remain intact across code changes.
 */
describe('AiService', () => {
  let service: AiService;

  // All dashboard pages that exist in the frontend
  const ALL_DASHBOARD_PAGES = [
    '/overview', '/messages', '/steps', '/segments', '/templates',
    '/friends', '/tags', '/rich-menus', '/forms', '/coupons',
    '/ai', '/auto-reply', '/reservations', '/analytics',
    '/referral', '/tutorial', '/settings', '/exit-popups',
    '/gacha', '/agency',
  ];

  // Pages that MUST have action types (they have forms/creation UIs)
  const PAGES_WITH_ACTIONS = [
    '/messages', '/steps', '/segments', '/templates', '/friends',
    '/tags', '/rich-menus', '/forms', '/coupons', '/ai',
    '/auto-reply', '/reservations',
  ];

  // Pages that are intentionally read-only (no action needed)
  const READ_ONLY_PAGES = [
    '/overview', '/analytics', '/referral', '/tutorial',
    '/settings', '/exit-popups', '/gacha', '/agency',
  ];

  beforeEach(async () => {
    const mockDb = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) }, // No API key — we won't call AI
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('pageContextMap coverage', () => {
    // Access the private map via contextAssistant's behavior
    // We test by calling contextAssistant and checking it doesn't crash on each page
    it('should have context defined for every dashboard page', async () => {
      // Access the pageContextMap indirectly — the method builds a prompt containing the context
      // If a page is missing, contextAssistant would fall back to 'ダッシュボード'
      // We verify by reflection since the map is defined inside the method
      const serviceProto = Object.getPrototypeOf(service);
      const methodSource = serviceProto.contextAssistant.toString();

      for (const page of ALL_DASHBOARD_PAGES) {
        expect(methodSource).toContain(`'${page}'`);
      }
    });

    it('should define action types for pages with forms', () => {
      const methodSource = Object.getPrototypeOf(service).contextAssistant.toString();

      for (const page of PAGES_WITH_ACTIONS) {
        // These pages should have "action type:" in their context definition
        const pagePattern = new RegExp(`'${page.replace('/', '\\/')}':\\s*'[^']*action type:`);
        expect(methodSource).toMatch(pagePattern);
      }
    });

    it('should mark read-only pages as no action needed', () => {
      const methodSource = Object.getPrototypeOf(service).contextAssistant.toString();

      for (const page of READ_ONLY_PAGES) {
        const pagePattern = new RegExp(`'${page.replace('/', '\\/')}':\\s*'[^']*actionは不要`);
        expect(methodSource).toMatch(pagePattern);
      }
    });

    it('dashboard page lists should be exhaustive (no unknown pages)', () => {
      const allKnown = [...PAGES_WITH_ACTIONS, ...READ_ONLY_PAGES].sort();
      const allDashboard = [...ALL_DASHBOARD_PAGES].sort();
      expect(allKnown).toEqual(allDashboard);
    });
  });
});
