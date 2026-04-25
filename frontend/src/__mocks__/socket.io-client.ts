const mockSocket = {
  connected: true,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

export const io = jest.fn(() => mockSocket);
export { mockSocket };
