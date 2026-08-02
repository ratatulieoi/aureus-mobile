import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

/** Must stay aligned with android/app/src/main/res/xml/file_paths.xml. */
export const NATIVE_EXPORT_DIRECTORY = 'aureus-exports';

export async function writeNativeExportFile(fileName: string, data: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) {
    throw new Error('Nama file ekspor tidak aman');
  }

  return Filesystem.writeFile({
    path: `${NATIVE_EXPORT_DIRECTORY}/${fileName}`,
    data,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}
