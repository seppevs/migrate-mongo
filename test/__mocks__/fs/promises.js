const promises = {
  stat: vi.fn(),
  cp: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
};

export default promises;
