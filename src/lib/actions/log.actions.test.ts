import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// --- Configuration --- //
const TEST_LOG_DIR_NAME = 'test_logs';
const TEST_LOG_DIR_PATH = path.join(process.cwd(), TEST_LOG_DIR_NAME);
const TEST_LOG_FILE = 'test_debug.log';
const TEST_LOG_PATH = path.join(TEST_LOG_DIR_PATH, TEST_LOG_FILE);

// --- Mocks --- //
vi.mock('../config', () => ({
  isCloud: vi.fn(),
  getProjectId: () => 'test-project-id',
  loggingConfig: {
    logDir: TEST_LOG_DIR_NAME,
    logFile: TEST_LOG_FILE,
  },
}));

const getEntries = vi.fn();
vi.mock('@google-cloud/logging', () => ({
    Logging: vi.fn(() => ({ 
        log: vi.fn(() => ({ getEntries }))
    })),
    __getEntriesMock: getEntries,
}));

// --- Lazy Import --- //
let getLogsAction: any;
let clearLogsAction: any;

beforeAll(async () => {
  const actions = await import('./log.actions');
  getLogsAction = actions.getLogsAction;
  clearLogsAction = actions.clearLogsAction;
});

// --- Test Suite --- //
describe('log.actions', () => {

  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.mkdir(TEST_LOG_DIR_PATH, { recursive: true });
    getEntries.mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_LOG_DIR_PATH, { recursive: true, force: true });
  });

  describe('Local Mode', () => {
    beforeEach(async () => {
      const { isCloud } = await import('../config');
      (isCloud as vi.Mock).mockReturnValue(false);
    });

    it('1. getLogsAction: reads existing log file', async () => {
      const logContent = '{"msg":"line 1"}\n{"msg":"line 2"}';
      await fs.writeFile(TEST_LOG_PATH, logContent);
      const result = await getLogsAction();
      expect(result.logFileExists).toBe(true);
      expect(result.logs).toEqual(['{"msg":"line 1"}', '{"msg":"line 2"}']);
    });

    it('2. getLogsAction: handles missing log file', async () => {
      const result = await getLogsAction();
      expect(result.logFileExists).toBe(false);
      expect(result.message).toContain('Log file not found');
    });

    it('4. clearLogsAction: deletes existing log file', async () => {
      await fs.writeFile(TEST_LOG_PATH, 'content');
      await clearLogsAction();
      await expect(fs.access(TEST_LOG_PATH)).rejects.toThrow();
    });

    it('5. clearLogsAction: handles missing log file', async () => {
      const result = await clearLogsAction();
      expect(result.success).toBe(true);
    });

    it('7. getLogsAction: handles read error', async () => {
      vi.spyOn(fs, 'stat').mockResolvedValueOnce({ size: 100 } as any);
      vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Permission denied'));
      const result = await getLogsAction();
      expect(result.error).toContain('Permission denied');
    });

    it('8. clearLogsAction: handles delete error', async () => {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      vi.spyOn(fs, 'unlink').mockRejectedValueOnce(error);
      const result = await clearLogsAction();
      expect(result.message).toContain('Permission denied');
    });
  });

  describe('Cloud Mode', () => {
    beforeEach(async () => {
      const { isCloud } = await import('../config');
      (isCloud as vi.Mock).mockReturnValue(true);
    });

    it('3. getLogsAction: returns correct source and message for no logs', async () => {
      const { __getEntriesMock } = await import('@google-cloud/logging');
      __getEntriesMock.mockResolvedValueOnce([[]]);
      const result = await getLogsAction();
      expect(result.source).toBe('cloud');
      expect(result.message).toContain('No logs found');
    });

    it('6. clearLogsAction: returns an error', async () => {
      const result = await clearLogsAction();
      expect(result.success).toBe(false);
      expect(result.message).toContain('not permitted');
    });
  });
});