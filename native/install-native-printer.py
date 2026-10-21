#!/usr/bin/env python3
from pathlib import Path
import re
import shutil
import sys

root = Path("android")
main_activity = next(root.glob("app/src/main/java/**/MainActivity.java"), None)
if main_activity is None:
    print("ERROR: MainActivity.java not found after Capacitor Android generation", file=sys.stderr)
    sys.exit(1)

package_match = re.search(r"^package\s+([\w.]+)\s*;", main_activity.read_text(), re.M)
if not package_match:
    print("ERROR: Could not determine Android package from MainActivity.java", file=sys.stderr)
    sys.exit(1)

package_name = package_match.group(1)
package_dir = main_activity.parent
plugin_source = Path("native/NativePrinterPlugin.java").read_text()
plugin_source = re.sub(r"^package\s+[\w.]+\s*;", "package " + package_name + ";", plugin_source, count=1, flags=re.M)
(package_dir / "NativePrinterPlugin.java").write_text(plugin_source)

main_text = main_activity.read_text()
import_line = f"import {package_name}.NativePrinterPlugin;"
if import_line not in main_text:
    main_text = re.sub(r"^(package\s+[\w.]+\s*;\s*)", r"\1\n" + import_line + "\n", main_text, count=1, flags=re.M)
if "registerPlugin(NativePrinterPlugin.class)" not in main_text:
    if "void onCreate(" in main_text:
        main_text = re.sub(
            r"(void onCreate\s*\(\s*Bundle\s+savedInstanceState\s*\)\s*\{)",
            r"\1\n        registerPlugin(NativePrinterPlugin.class);",
            main_text,
            count=1
        )
    else:
        main_text = main_text.rstrip()[:-1] + """
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NativePrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
"""
main_activity.write_text(main_text)
print(f"Registered NativePrinter Capacitor plugin in {main_activity}")
