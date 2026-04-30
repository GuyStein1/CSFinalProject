import { uploadImage } from '../uploadImage';

const mockRef = { _path: 'mock-ref' };
const mockUploadBytes = jest.fn().mockResolvedValue({});
const mockGetDownloadURL = jest.fn().mockResolvedValue('https://example.com/image.jpg');
const mockRefFn = jest.fn().mockReturnValue(mockRef);

jest.mock('firebase/storage', () => ({
  ref: (...args: unknown[]) => mockRefFn(...args),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
}));

const mockBlob = new Blob(['image-data']);
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    blob: jest.fn().mockResolvedValue(mockBlob),
  });
  mockUploadBytes.mockResolvedValue({});
  mockGetDownloadURL.mockResolvedValue('https://example.com/image.jpg');
});

describe('uploadImage', () => {
  it('fetches the URI, uploads the blob, and returns the download URL', async () => {
    const url = await uploadImage('file:///local/photo.jpg', 'avatars/user1/photo.jpg');

    expect(mockFetch).toHaveBeenCalledWith('file:///local/photo.jpg');
    expect(mockUploadBytes).toHaveBeenCalledWith(mockRef, mockBlob);
    expect(mockGetDownloadURL).toHaveBeenCalledWith(mockRef);
    expect(url).toBe('https://example.com/image.jpg');
  });

  it('uses the provided path to create the storage ref', async () => {
    await uploadImage('file:///img.jpg', 'portfolio/uid/123.jpg');
    expect(mockRefFn).toHaveBeenCalledWith(expect.anything(), 'portfolio/uid/123.jpg');
  });

  it('throws when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(uploadImage('file:///bad.jpg', 'path/img.jpg')).rejects.toThrow('Network failure');
  });

  it('throws when uploadBytes fails', async () => {
    mockUploadBytes.mockRejectedValue(new Error('Storage quota exceeded'));
    await expect(uploadImage('file:///img.jpg', 'path/img.jpg')).rejects.toThrow('Storage quota exceeded');
  });
});
