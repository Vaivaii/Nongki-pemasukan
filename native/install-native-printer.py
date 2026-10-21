#!/usr/bin/env python3
"""Register the local NativePrinter plugin in the generated Capacitor Android app."""
from pathlib import Path
import re
import sys

root = Path("android")
manifest = root / "app/src/main/AndroidManifest.xml"
if manifest.exists():
    manifest_text = manifest.read_text(encoding="utf-8")
    permissions = [
        '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
        '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
        '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
    ]
    for permission in permissions:
        if permission not in manifest_text:
            manifest_text = re.sub(r"(<manifest[^>]*>)", r"\\1\\n    " + permission, manifest_text, count=1)
    manifest.write_text(manifest_text, encoding="utf-8")
else:
    print("ERROR: AndroidManifest.xml not found after Capacitor Android generation", file=sys.stderr)
    sys.exit(1)
main_activity = next(root.glob("app/src/main/java/**/MainActivity.java"), None)
if main_activity is None:
    print("ERROR: MainActivity.java not found after Capacitor Android generation", file=sys.stderr)
    sys.exit(1)

main_text = main_activity.read_text(encoding="utf-8")
package_match = re.search(r"^package\s+([\w.]+)\s*;", main_text, re.M)
if not package_match:
    print("ERROR: Could not determine Android package from MainActivity.java", file=sys.stderr)
    sys.exit(1)

package_name = package_match.group(1)
package_dir = main_activity.parent
plugin_source = Path("native/NativePrinterPlugin.java").read_text(encoding="utf-8")
plugin_source = re.sub(
    r"^package\s+[\w.]+\s*;",
    "package " + package_name + ";",
    plugin_source,
    count=1,
    flags=re.M,
)
(package_dir / "NativePrinterPlugin.java").write_text(plugin_source, encoding="utf-8")

import_line = f"import {package_name}.NativePrinterPlugin;"
if import_line not in main_text:
    main_text = re.sub(
        r"^(package\s+[\w.]+\s*;\s*)",
        lambda match: match.group(1) + "\n" + import_line + "\n",
        main_text,
        count=1,
        flags=re.M,
    )

if "registerPlugin(NativePrinterPlugin.class)" not in main_text:
    # Capacitor templates may use either Bundle or android.os.Bundle. Match both,
    # and fail loudly rather than ever adding a duplicate onCreate method.
    on_create = re.search(
        r"(public\s+void\s+onCreate\s*\(\s*(?:android\.os\.)?Bundle\s+\w+\s*\)\s*\{)",
        main_text,
    )
    if on_create:
        insert_at = on_create.end()
        main_text = (
            main_text[:insert_at]
            + "\n        registerPlugin(NativePrinterPlugin.class);"
            + main_text[insert_at:]
        )
    else:
        print(
            f"ERROR: Existing onCreate(Bundle) not found in {main_activity}; "
            "refusing to add a second lifecycle method.",
            file=sys.stderr,
        )
        sys.exit(1)

main_activity.write_text(main_text, encoding="utf-8")
print(f"Registered NativePrinter Capacitor plugin in {main_activity}")
