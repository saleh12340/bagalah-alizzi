import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

// NOTE:
// - expo-print is used to generate/print PDFs and works on Expo Managed.
// - TCP printing uses react-native-tcp-socket; if not installed the TCP function will throw a clear error.
// - Bluetooth printing requires native modules and will be available after prebuild/EAS when configured.

export type TcpOptions = { ip: string; port?: number };

export async function printPdf(fileUri: string) {
  // If fileUri is a remote url or local file uri that points to a PDF, delegate to expo-print
  try {
    await Print.printAsync({ uri: fileUri });
    return true;
  } catch (err) {
    console.warn('printPdf failed', err);
    throw err;
  }
}

export async function printHtml(html: string) {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    // On mobile we can send the uri to native print UI
    await Print.printAsync({ uri });
    return uri;
  } catch (err) {
    console.warn('printHtml failed', err);
    throw err;
  }
}

export async function printImageAsPdf(base64Png: string) {
  // Create a simple HTML wrapper that shows the image and print it as PDF (reliable for Arabic)
  const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:8px;font-family: Cairo, sans-serif;"><img src="data:image/png;base64,${base64Png}" style="width:100%;height:auto;"/></body></html>`;
  return printHtml(html);
}

export async function printTcp(options: TcpOptions, data: Uint8Array | ArrayBuffer) {
  // print via TCP/IP socket to printer (common for network thermal printers on port 9100)
  // This function requires react-native-tcp-socket. If not installed it will throw a helpful error.
  try {
    // dynamic import so that projects without the package won't fail at load time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TcpSocket = require('react-native-tcp-socket');
    return new Promise<void>((resolve, reject) => {
      const client = TcpSocket.createConnection({ port: options.port || 9100, host: options.ip }, () => {
        try {
          client.write(Buffer.from(data));
          client.end();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      client.on('error', (err: any) => reject(err));
    });
  } catch (e) {
    const msg = 'TCP printing requires react-native-tcp-socket. Install it and rebuild (prebuild/EAS) to enable.';
    console.warn(msg, e);
    throw new Error(msg);
  }
}

export function bluetoothAvailable(): boolean {
  // Placeholder: returns false until native bluetooth printing lib is added and initialized.
  return false;
}

export async function printBluetooth(/* printerId, data */) {
  throw new Error('Bluetooth printing is not available until native bluetooth library is installed and prebuilt.');
}

export async function exportBackupJson(obj: unknown) {
  try {
    const json = JSON.stringify(obj, null, 2);
    const fileName = `bagalah-backup-${Date.now()}.json`;
    const path = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    return path;
  } catch (e) {
    console.warn('exportBackupJson failed', e);
    throw e;
  }
}
