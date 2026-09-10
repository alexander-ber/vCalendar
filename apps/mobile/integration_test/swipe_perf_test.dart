import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:vcalendar_mobile/app/vcalendar_app.dart';

/// Measures real per-frame build/raster timing (via FrameTiming, only
/// meaningful under the live IntegrationTestWidgetsFlutterBinding used
/// here - a plain `flutter test` widget test doesn't render real frames)
/// while flinging the month calendar's PageView. Run against a booted
/// simulator/device with:
/// `flutter test integration_test/swipe_perf_test.dart -d <device id>`
///
/// Prints SWIPE_PERF/SWIPE_PERF_FRAME lines rather than asserting a strict
/// threshold - simulator frame timing is too variable across machines/runs
/// to make a hard pass/fail meaningful, but a build time that jumps into
/// the hundreds of ms for any single frame is a real regression worth
/// noticing by eye.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  tz.initializeTimeZones();

  testWidgets('month swipe frame timing', (tester) async {
    final frameTimings = <FrameTiming>[];
    tester.binding.addTimingsCallback(frameTimings.addAll);

    await tester.pumpWidget(const VCalendarApp());
    await tester.pumpAndSettle(const Duration(seconds: 8));

    final pageViewFinder = find.byType(PageView);
    expect(pageViewFinder, findsOneWidget);

    // Give the post-load neighbor-month prefetch a moment to actually run
    // (it's scheduled via addPostFrameCallback, two frames deep).
    await tester.pump(const Duration(milliseconds: 500));

    frameTimings.clear();
    await tester.fling(pageViewFinder, const Offset(-300, 0), 1200);
    await tester.pumpAndSettle();

    final buildMs = frameTimings
        .map((t) => t.buildDuration.inMicroseconds / 1000)
        .toList();
    final rasterMs = frameTimings
        .map((t) => t.rasterDuration.inMicroseconds / 1000)
        .toList();
    final totalMs = List.generate(
      frameTimings.length,
      (i) => buildMs[i] + rasterMs[i],
    );
    final maxBuild = buildMs.isEmpty
        ? 0.0
        : buildMs.reduce((a, b) => a > b ? a : b);
    final maxTotal = totalMs.isEmpty
        ? 0.0
        : totalMs.reduce((a, b) => a > b ? a : b);
    final jankFrames = totalMs.where((d) => d > 16.7).length;

    // ignore: avoid_print
    print(
      'SWIPE_PERF frames=${frameTimings.length} '
      'maxBuildMs=${maxBuild.toStringAsFixed(2)} '
      'maxTotalMs=${maxTotal.toStringAsFixed(2)} '
      'jankFrames(>16.7ms)=$jankFrames',
    );
    for (var i = 0; i < totalMs.length; i++) {
      // ignore: avoid_print
      print(
        'SWIPE_PERF_FRAME $i build=${buildMs[i].toStringAsFixed(2)}ms '
        'raster=${rasterMs[i].toStringAsFixed(2)}ms',
      );
    }
  });
}
