import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { NATIVE_EXPORT_DIRECTORY, writeNativeExportFile } from './export-file';

vi.mock('@capacitor/filesystem', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/filesystem')>();
  return {
    ...original,
    Filesystem: { writeFile: vi.fn() },
  };
});

beforeEach(() => {
  vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///cache/aureus-exports/export.json' });
});

describe('native export storage boundary', () => {
  it('writes only beneath the dedicated cache directory', async () => {
    await expect(writeNativeExportFile('backup-2026-01-01.json', '{}')).resolves.toEqual({
      uri: 'file:///cache/aureus-exports/export.json',
    });
    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path: `${NATIVE_EXPORT_DIRECTORY}/backup-2026-01-01.json`,
      data: '{}',
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  });

  it.each(['../ledger.json', 'nested/file.csv', 'file name.csv'])('rejects unsafe export name %s', async (fileName) => {
    await expect(writeNativeExportFile(fileName, 'data')).rejects.toThrow('Nama file ekspor tidak aman');
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
  });
});
