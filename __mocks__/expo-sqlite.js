/**
 * Mock for expo-sqlite
 *
 * Provides a minimal mock of SQLite functionality for testing.
 * Does not actually execute SQL - just tracks calls.
 */

const mockDatabase = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowId: 0 }),
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

module.exports = {
  openDatabaseSync: jest.fn(() => mockDatabase),
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDatabase),

  // Export mock database for test assertions
  __mockDatabase: mockDatabase,

  // Reset all mocks
  __reset: () => {
    mockDatabase.execAsync.mockClear();
    mockDatabase.getAllAsync.mockClear();
    mockDatabase.getFirstAsync.mockClear();
    mockDatabase.runAsync.mockClear();
    mockDatabase.closeAsync.mockClear();
  },
};
