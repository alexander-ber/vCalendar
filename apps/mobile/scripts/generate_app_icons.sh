#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${1:-$ROOT_DIR/assets/images/app-icon.png}"
IOS_DIR="$ROOT_DIR/ios/Runner/Assets.xcassets/AppIcon.appiconset"
ANDROID_RES="$ROOT_DIR/android/app/src/main/res"

if [[ ! -f "$SOURCE" ]]; then
  echo "Icon source not found: $SOURCE" >&2
  exit 1
fi

make_png() {
  local size="$1"
  local output="$2"
  sips -s format png -z "$size" "$size" "$SOURCE" --out "$output" >/dev/null
}

make_png 20 "$IOS_DIR/Icon-App-20x20@1x.png"
make_png 40 "$IOS_DIR/Icon-App-20x20@2x.png"
make_png 60 "$IOS_DIR/Icon-App-20x20@3x.png"
make_png 29 "$IOS_DIR/Icon-App-29x29@1x.png"
make_png 58 "$IOS_DIR/Icon-App-29x29@2x.png"
make_png 87 "$IOS_DIR/Icon-App-29x29@3x.png"
make_png 40 "$IOS_DIR/Icon-App-40x40@1x.png"
make_png 80 "$IOS_DIR/Icon-App-40x40@2x.png"
make_png 120 "$IOS_DIR/Icon-App-40x40@3x.png"
make_png 120 "$IOS_DIR/Icon-App-60x60@2x.png"
make_png 180 "$IOS_DIR/Icon-App-60x60@3x.png"
make_png 76 "$IOS_DIR/Icon-App-76x76@1x.png"
make_png 152 "$IOS_DIR/Icon-App-76x76@2x.png"
make_png 167 "$IOS_DIR/Icon-App-83.5x83.5@2x.png"
make_png 1024 "$IOS_DIR/Icon-App-1024x1024@1x.png"

make_png 48 "$ANDROID_RES/mipmap-mdpi/ic_launcher.png"
make_png 72 "$ANDROID_RES/mipmap-hdpi/ic_launcher.png"
make_png 96 "$ANDROID_RES/mipmap-xhdpi/ic_launcher.png"
make_png 144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher.png"
make_png 192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher.png"

echo "Generated app icons from $SOURCE"
