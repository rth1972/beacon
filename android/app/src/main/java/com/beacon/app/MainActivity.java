package com.beacon.app;

import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PREFS_NAME = "beacon_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_CONFIG_DONE = "config_done";

    private WebView webView;
    private View configView;
    private View toolbarView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean configured = prefs.getBoolean(KEY_CONFIG_DONE, false);

        if (!configured) {
            showConfigScreen(prefs);
        }
    }

    private void showConfigScreen(SharedPreferences prefs) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.parseColor("#0f0f0f"));

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setPadding(16, 16, 16, 16);
        header.setBackgroundColor(Color.parseColor("#0a0a0a"));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("Beacon");
        title.setTextSize(17);
        title.setTextColor(Color.parseColor("#e8e8e8"));
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        header.addView(title);

        layout.addView(header);

        // Content area
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        content.setPadding(32, 32, 32, 32);
        content.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Description
        TextView desc = new TextView(this);
        desc.setText("Connect to your self-hosted Beacon push notification server.");
        desc.setTextSize(14);
        desc.setTextColor(Color.parseColor("#888888"));
        desc.setGravity(Gravity.CENTER);
        desc.setLineSpacing(0, 1.6f);
        desc.setMaxWidth(320);
        content.addView(desc);

        // Spacer
        content.addView(createSpacer(24));

        // Label
        TextView label = new TextView(this);
        label.setText("SERVER URL");
        label.setTextSize(12);
        label.setTextColor(Color.parseColor("#888888"));
        label.setTypeface(null, android.graphics.Typeface.BOLD);
        label.setLetterSpacing(0.05f);
        content.addView(label);

        // Spacer
        content.addView(createSpacer(8));

        // Input
        EditText input = new EditText(this);
        input.setHint("http://192.168.1.x:3000");
        input.setTextSize(15);
        input.setTextColor(Color.parseColor("#e8e8e8"));
        input.setHintTextColor(Color.parseColor("#444444"));
        input.setBackgroundResource(android.R.drawable.editbox_background);
        input.setPadding(14, 12, 14, 12);
        input.setSingleLine(true);

        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        inputParams.setMargins(0, 0, 0, 0);
        input.setLayoutParams(inputParams);
        content.addView(input);

        // Error label
        TextView error = new TextView(this);
        error.setTextColor(Color.parseColor("#e74c3c"));
        error.setTextSize(13);
        error.setGravity(Gravity.CENTER);
        error.setVisibility(View.GONE);
        content.addView(error);

        // Spacer
        content.addView(createSpacer(16));

        // Connect button
        Button connectBtn = new Button(this);
        connectBtn.setText("Connect");
        connectBtn.setTextSize(15);
        connectBtn.setTextColor(Color.WHITE);
        connectBtn.setBackgroundColor(Color.parseColor("#f3ba40"));
        connectBtn.setPadding(0, 12, 0, 12);
        connectBtn.setAllCaps(false);
        connectBtn.setTypeface(null, android.graphics.Typeface.BOLD);

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        connectBtn.setLayoutParams(btnParams);

        connectBtn.setOnClickListener(v -> {
            String url = input.getText().toString().trim();
            if (url.isEmpty()) {
                error.setText("Please enter a server URL.");
                error.setVisibility(View.VISIBLE);
                return;
            }
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
            }
            url = url.replaceAll("/+$", "");
            error.setVisibility(View.GONE);

            prefs.edit()
                    .putString(KEY_SERVER_URL, url)
                    .putBoolean(KEY_CONFIG_DONE, true)
                    .apply();

            loadBeaconApp(url);
        });

        content.addView(connectBtn);

        // Spacer
        content.addView(createSpacer(16));

        // Hint
        TextView hint = new TextView(this);
        hint.setText("Enter the URL where your Beacon server is running.\nFor local development use your machine's local IP.");
        hint.setTextSize(12);
        hint.setTextColor(Color.parseColor("#555555"));
        hint.setGravity(Gravity.CENTER);
        hint.setLineSpacing(0, 1.5f);
        content.addView(hint);

        layout.addView(content);

        configView = layout;
        addContentView(configView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
    }

    private void loadBeaconApp(String url) {
        if (configView != null) {
            ((ViewGroup) configView.getParent()).removeView(configView);
            configView = null;
        }

        // Create toolbar
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setBackgroundColor(Color.parseColor("#0a0a0a"));
        toolbar.setPadding(8, 8, 8, 8);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);

        // Back button
        Button backBtn = new Button(this);
        backBtn.setText("←");
        backBtn.setTextSize(16);
        backBtn.setTextColor(Color.parseColor("#888888"));
        backBtn.setBackgroundColor(Color.TRANSPARENT);
        backBtn.setPadding(8, 4, 8, 4);
        backBtn.setOnClickListener(v -> {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
            }
        });
        toolbar.addView(backBtn);

        // Forward button
        Button fwdBtn = new Button(this);
        fwdBtn.setText("→");
        fwdBtn.setTextSize(16);
        fwdBtn.setTextColor(Color.parseColor("#888888"));
        fwdBtn.setBackgroundColor(Color.TRANSPARENT);
        fwdBtn.setPadding(8, 4, 8, 4);
        fwdBtn.setOnClickListener(v -> {
            if (webView != null && webView.canGoForward()) {
                webView.goForward();
            }
        });
        toolbar.addView(fwdBtn);

        // Spacer
        TextView spacer = new TextView(this);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f
        ));
        toolbar.addView(spacer);

        // URL display
        TextView urlDisplay = new TextView(this);
        urlDisplay.setText(url);
        urlDisplay.setTextSize(11);
        urlDisplay.setTextColor(Color.parseColor("#666666"));
        urlDisplay.setMaxLines(1);
        urlDisplay.setEllipsize(android.text.TextUtils.TruncateAt.MARQUEE);
        urlDisplay.setMarqueeRepeatLimit(-1);
        urlDisplay.setSelected(true);
        toolbar.addView(urlDisplay);

        // Spacer
        TextView spacer2 = new TextView(this);
        spacer2.setLayoutParams(new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f
        ));
        toolbar.addView(spacer2);

        // Settings button
        Button settingsBtn = new Button(this);
        settingsBtn.setText("⚙");
        settingsBtn.setTextSize(16);
        settingsBtn.setTextColor(Color.parseColor("#888888"));
        settingsBtn.setBackgroundColor(Color.TRANSPARENT);
        settingsBtn.setPadding(8, 4, 8, 4);
        settingsBtn.setOnClickListener(v -> showSettingsDialog());
        toolbar.addView(settingsBtn);

        // Create WebView
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                view.loadUrl(request.getUrl().toString());
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        // Layout: toolbar + WebView
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        mainLayout.addView(toolbar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        mainLayout.addView(webView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0, 1f
        ));

        toolbarView = toolbar;
        addContentView(mainLayout, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        webView.loadUrl(url);
    }

    private void showSettingsDialog() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String currentUrl = prefs.getString(KEY_SERVER_URL, "");

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Server URL");

        EditText input = new EditText(this);
        input.setText(currentUrl);
        input.setSelectAllOnFocus(true);
        input.setPadding(16, 16, 16, 16);
        builder.setView(input);

        builder.setPositiveButton("Save & Reload", (dialog, which) -> {
            String url = input.getText().toString().trim();
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
            }
            url = url.replaceAll("/+$", "");
            prefs.edit()
                    .putString(KEY_SERVER_URL, url)
                    .putBoolean(KEY_CONFIG_DONE, true)
                    .apply();
            if (webView != null) {
                webView.loadUrl(url);
            }
        });

        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private View createSpacer(int height) {
        TextView spacer = new TextView(this);
        spacer.setHeight(height);
        return spacer;
    }
}
