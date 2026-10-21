package com.nongki.pemasukan.uibaru;

import android.Manifest;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.print.PrintAttributes;
import android.print.PrintJob;
import android.print.PrintManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import android.util.Base64;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "NativePrinter",
    permissions = {
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_CONNECT })
    }
)
public class NativePrinterPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<WebView> activeViews = new ArrayList<>();
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void printHtml(PluginCall call) {
        final String html = call.getString("html");
        final String requestedName = call.getString("name", "Struk Nongki");
        if (html == null || html.trim().isEmpty()) {
            call.reject("Konten struk kosong.");
            return;
        }
        if (getActivity() == null) {
            call.reject("Aktivitas Android belum siap.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Context context = getContext();
                PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) {
                    call.reject("Layanan cetak Android tidak tersedia di perangkat ini.");
                    return;
                }
                String jobName = requestedName.trim().isEmpty() ? "Struk Nongki" : requestedName.trim();
                WebView webView = new WebView(context);
                webView.getSettings().setJavaScriptEnabled(false);
                activeViews.add(webView);
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        try {
                            PrintAttributes attributes = new PrintAttributes.Builder()
                                .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                                .build();
                            PrintJob job = printManager.print(jobName, view.createPrintDocumentAdapter(jobName), attributes);
                            call.resolve(new JSObject().put("started", true).put("jobName", jobName));
                            cleanupWhenFinished(job, view, 0);
                        } catch (Exception e) {
                            activeViews.remove(view);
                            view.destroy();
                            call.reject("Gagal membuka dialog cetak Android: " + e.getMessage(), e);
                        }
                    }
                });
                webView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                call.reject("Tidak dapat menyiapkan struk untuk dicetak: " + e.getMessage(), e);
            }
        });
    }


    @PluginMethod
    public void shareBluetoothPrintText(PluginCall call) {
        final String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Data struk untuk Bluetooth Print kosong.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setPackage("mate.bluetoothprint");
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, text);
                intent.putExtra(Intent.EXTRA_TITLE, "Struk Nongki");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(intent);
                call.resolve(new JSObject().put("opened", true).put("package", "mate.bluetoothprint"));
            } catch (ActivityNotFoundException e) {
                call.reject("Aplikasi Bluetooth Print (mate.bluetoothprint) belum terpasang. Instal aplikasi tersebut lalu coba lagi.", e);
            } catch (Exception e) {
                call.reject("Tidak dapat membuka Bluetooth Print: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void getPairedBluetoothPrinters(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "bluetoothListPermissionCallback");
            return;
        }
        resolvePairedPrinters(call);
    }

    @PermissionCallback
    private void bluetoothListPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Izin Bluetooth diperlukan untuk membaca printer yang sudah dipasangkan.");
            return;
        }
        resolvePairedPrinters(call);
    }

    private void resolvePairedPrinters(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("Perangkat ini tidak memiliki Bluetooth.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("Aktifkan Bluetooth Android terlebih dahulu.");
                return;
            }
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            for (BluetoothDevice device : bonded) {
                JSObject item = new JSObject();
                item.put("name", device.getName() == null ? "Printer Bluetooth" : device.getName());
                item.put("address", device.getAddress());
                devices.put(item);
            }
            call.resolve(new JSObject().put("devices", devices));
        } catch (SecurityException e) {
            call.reject("Izin Bluetooth belum diberikan.", e);
        } catch (Exception e) {
            call.reject("Gagal membaca perangkat Bluetooth: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void printBluetoothReceipt(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPrintPermissionCallback");
            return;
        }
        performBluetoothPrint(call);
    }

    @PermissionCallback
    private void bluetoothPrintPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Izin Bluetooth diperlukan untuk mencetak struk.");
            return;
        }
        performBluetoothPrint(call);
    }

    private void performBluetoothPrint(PluginCall call) {
        final String address = call.getString("address");
        final String receipt = call.getString("text");
        final String logoBase64 = call.getString("logoBase64");
        if (address == null || address.trim().isEmpty() || receipt == null || receipt.trim().isEmpty()) {
            call.reject("Alamat printer atau isi struk kosong.");
            return;
        }
        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null) throw new Exception("Bluetooth tidak tersedia.");
                if (!adapter.isEnabled()) throw new Exception("Aktifkan Bluetooth Android terlebih dahulu.");
                BluetoothDevice device = adapter.getRemoteDevice(address);
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                OutputStream output = socket.getOutputStream();
                output.write(new byte[] { 0x1B, 0x40, 0x1B, 0x61, 0x01 });
                if (logoBase64 != null && !logoBase64.trim().isEmpty()) writeRasterLogo(output, logoBase64);
                else output.write("NONGKI\nICE AND COFFEE\n".getBytes("UTF-8"));
                output.write(new byte[] { 0x1B, 0x61, 0x00 });
                output.write(receipt.getBytes("UTF-8"));
                output.write(new byte[] { 0x0A, 0x0A, 0x0A });
                output.flush();
                JSObject result = new JSObject();
                result.put("printed", true);
                result.put("printerAddress", address);
                call.resolve(result);
            } catch (SecurityException e) {
                call.reject("Izin Bluetooth belum diberikan.", e);
            } catch (Exception e) {
                call.reject("Gagal mencetak. Pastikan printer thermal sudah dipasangkan dan mendukung Bluetooth Classic SPP. " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }


    private void writeRasterLogo(OutputStream output, String encoded) throws Exception {
        byte[] imageBytes = Base64.decode(encoded, Base64.DEFAULT);
        Bitmap original = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);
        if (original == null) throw new Exception("Gambar logo tidak dapat dibaca.");
        int targetWidth = Math.min(384, original.getWidth());
        int targetHeight = Math.max(1, Math.round((float) original.getHeight() * targetWidth / original.getWidth()));
        Bitmap bitmap = Bitmap.createScaledBitmap(original, targetWidth, targetHeight, true);
        int widthBytes = (targetWidth + 7) / 8;
        byte[] raster = new byte[widthBytes * targetHeight];
        for (int y = 0; y < targetHeight; y++) {
            for (int x = 0; x < targetWidth; x++) {
                int pixel = bitmap.getPixel(x, y);
                int alpha = (pixel >>> 24) & 0xff;
                int red = (pixel >>> 16) & 0xff;
                int green = (pixel >>> 8) & 0xff;
                int blue = pixel & 0xff;
                int luminance = (red * 299 + green * 587 + blue * 114) / 1000;
                if (alpha > 80 && luminance < 190) {
                    int index = y * widthBytes + (x / 8);
                    raster[index] |= (byte) (0x80 >> (x % 8));
                }
            }
        }
        output.write(new byte[] { 0x1B, 0x61, 0x01 });
        output.write(new byte[] { 0x1D, 0x76, 0x30, 0x00, (byte)(widthBytes & 0xff), (byte)((widthBytes >> 8) & 0xff), (byte)(targetHeight & 0xff), (byte)((targetHeight >> 8) & 0xff) });
        output.write(raster);
        output.write(new byte[] { 0x0A, 0x1B, 0x61, 0x00 });
        bitmap.recycle();
        if (original != bitmap) original.recycle();
    }

    private void cleanupWhenFinished(PrintJob job, WebView view, int attempts) {
        handler.postDelayed(() -> {
            boolean done = job.isCompleted() || job.isCancelled() || job.isFailed();
            if (done || attempts >= 360) {
                activeViews.remove(view);
                view.stopLoading();
                view.destroy();
            } else {
                cleanupWhenFinished(job, view, attempts + 1);
            }
        }, 500);
    }
}
