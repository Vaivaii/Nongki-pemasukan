package com.nongki.pemasukan.uibaru;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
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
import com.getcapacitor.PermissionCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
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
                output.write("NONGKI\nICE AND COFFEE\n".getBytes("UTF-8"));
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
