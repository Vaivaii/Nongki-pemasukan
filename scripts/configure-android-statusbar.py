#!/usr/bin/env python3
"""Set the Android status bar to match Nongki's dark-green header."""
from pathlib import Path
import re
import sys

root = Path("android/app/src/main")
java_files = list(root.rglob("MainActivity.java"))
if not java_files:
    print("MainActivity.java not found; Capacitor Android project was not generated.", file=sys.stderr)
    sys.exit(1)

java = java_files[0]
source = java.read_text(encoding="utf-8")
if "nongkiStatusBar" not in source:
    match = re.search(r"(public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{)", source)
    if not match:
        print(f"Could not find MainActivity class declaration in {java}", file=sys.stderr)
        sys.exit(1)
    addition = """
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // nongkiStatusBar: match the native status bar to the app's dark-green header.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(android.graphics.Color.rgb(23, 61, 44));
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            android.view.View decor = getWindow().getDecorView();
            int flags = decor.getSystemUiVisibility();
            flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            decor.setSystemUiVisibility(flags);
        }
    }
"""
    source = source[:match.end()] + addition + source[match.end():]
    java.write_text(source, encoding="utf-8")

print(f"Configured dark-green status bar in {java}")
