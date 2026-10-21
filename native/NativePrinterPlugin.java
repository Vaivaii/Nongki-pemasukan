package com.nongki.pemasukan.uibaru;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintJob;
import android.print.PrintManager;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "NativePrinter")
public class NativePrinterPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<WebView> activeViews = new ArrayList<>();

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
                            PrintJob job = printManager.print(
                                jobName,
                                view.createPrintDocumentAdapter(jobName),
                                attributes
                            );
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
