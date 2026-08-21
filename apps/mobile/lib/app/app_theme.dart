import 'package:flutter/material.dart';

enum AppThemeMode { day, night, sepia, ocean, forest, lotus, icon }

class AppTheme {
  static ThemeData fromMode(AppThemeMode mode) {
    final palette = switch (mode) {
      AppThemeMode.day => _Palette(
        background: Colors.white,
        surface: const Color(0xFFF8FBFD),
        primary: const Color(0xFF315F9F),
        onPrimary: Colors.white,
        text: const Color(0xFF1D2533),
        muted: const Color(0xFF6D7789),
        outline: const Color(0xFFD7E2ED),
        eventText: const Color(0xFF1D2533),
        vaishnavaAppearance: const Color(0xFFD8C9FF),
        vaishnavaDisappearance: const Color(0xFFE1C5FF),
        festival: const Color(0xFFFFD29A),
        parana: const Color(0xFFBDEFD9),
      ),
      AppThemeMode.night => _Palette(
        background: const Color(0xFF101827),
        surface: const Color(0xFF172235),
        primary: const Color(0xFF8FB4FF),
        onPrimary: const Color(0xFF101827),
        text: const Color(0xFFEAF0FF),
        muted: const Color(0xFFAAB6CA),
        outline: const Color(0xFF2B3A54),
        eventText: const Color(0xFFF5F8FF),
        vaishnavaAppearance: const Color(0xFF463983),
        vaishnavaDisappearance: const Color(0xFF573579),
        festival: const Color(0xFF6A4217),
        parana: const Color(0xFF164F43),
      ),
      AppThemeMode.sepia => _Palette(
        background: const Color(0xFFF7EFDF),
        surface: const Color(0xFFFFFBF3),
        primary: const Color(0xFF9A6817),
        onPrimary: Colors.white,
        text: const Color(0xFF2A241A),
        muted: const Color(0xFF756B5A),
        outline: const Color(0xFFE1D1B5),
        eventText: const Color(0xFF2A241A),
        vaishnavaAppearance: const Color(0xFFE5D7FF),
        vaishnavaDisappearance: const Color(0xFFEBD7FF),
        festival: const Color(0xFFFFD8A5),
        parana: const Color(0xFFD2F1DF),
      ),
      AppThemeMode.ocean => _Palette(
        background: const Color(0xFFEEF7FA),
        surface: const Color(0xFFFBFEFF),
        primary: const Color(0xFF2F6F8F),
        onPrimary: Colors.white,
        text: const Color(0xFF182832),
        muted: const Color(0xFF667985),
        outline: const Color(0xFFD0E0E7),
        eventText: const Color(0xFF182832),
        vaishnavaAppearance: const Color(0xFFD9E0FF),
        vaishnavaDisappearance: const Color(0xFFE3D8FF),
        festival: const Color(0xFFFFD8AF),
        parana: const Color(0xFFC8EFEA),
      ),
      AppThemeMode.forest => _Palette(
        background: const Color(0xFFF0F7EF),
        surface: const Color(0xFFFCFFF8),
        primary: const Color(0xFF557645),
        onPrimary: Colors.white,
        text: const Color(0xFF20291E),
        muted: const Color(0xFF6C7765),
        outline: const Color(0xFFD4E2CF),
        eventText: const Color(0xFF20291E),
        vaishnavaAppearance: const Color(0xFFE1D6FF),
        vaishnavaDisappearance: const Color(0xFFEAD5F5),
        festival: const Color(0xFFFFD8A3),
        parana: const Color(0xFFD4F0CF),
      ),
      AppThemeMode.lotus => _Palette(
        background: const Color(0xFFF6F1FA),
        surface: const Color(0xFFFFFBFF),
        primary: const Color(0xFF6B5CA5),
        onPrimary: Colors.white,
        text: const Color(0xFF252231),
        muted: const Color(0xFF756E83),
        outline: const Color(0xFFE0D5E8),
        eventText: const Color(0xFF252231),
        vaishnavaAppearance: const Color(0xFFE5D8FF),
        vaishnavaDisappearance: const Color(0xFFF0D4F4),
        festival: const Color(0xFFFFD6B8),
        parana: const Color(0xFFD7EEDB),
      ),
      AppThemeMode.icon => _Palette(
        background: const Color(0xFFE6F1FF),
        surface: Colors.white,
        primary: const Color(0xFF073E8E),
        onPrimary: Colors.white,
        text: const Color(0xFF082B5E),
        muted: const Color(0xFF607B9E),
        outline: const Color(0xFFAECFF3),
        eventText: const Color(0xFF082B5E),
        vaishnavaAppearance: const Color(0xFFCFE2FF),
        vaishnavaDisappearance: const Color(0xFFE1D7FF),
        festival: const Color(0xFFFFBE73),
        parana: const Color(0xFFC7F0E9),
      ),
    };
    final isIconTheme = mode == AppThemeMode.icon;
    const iconGold = Color(0xFFA3620A);
    const iconGoldSoft = Color(0xFFF2B562);
    const iconBlueSoft = Color(0xFFDDEBFF);

    final scheme =
        ColorScheme.fromSeed(
          seedColor: palette.primary,
          brightness: mode == AppThemeMode.night
              ? Brightness.dark
              : Brightness.light,
        ).copyWith(
          primary: palette.primary,
          onPrimary: palette.onPrimary,
          surface: palette.surface,
          onSurface: palette.text,
          outline: palette.outline,
          secondary: isIconTheme ? iconGold : null,
          onSecondary: isIconTheme ? const Color(0xFF082B5E) : null,
          primaryContainer: isIconTheme ? iconBlueSoft : null,
          onPrimaryContainer: isIconTheme ? palette.primary : null,
          secondaryContainer: isIconTheme ? iconGoldSoft : null,
          onSecondaryContainer: isIconTheme ? const Color(0xFF2D2100) : null,
        );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: palette.background,
      fontFamily: 'Roboto',
      textTheme: Typography.material2021().black.apply(
        bodyColor: palette.text,
        displayColor: palette.text,
      ),
      cardTheme: CardThemeData(
        color: palette.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: palette.outline),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: palette.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: palette.outline),
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          visualDensity: VisualDensity.comfortable,
          backgroundColor: isIconTheme
              ? WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return iconGoldSoft;
                  }
                  return palette.surface;
                })
              : null,
          foregroundColor: isIconTheme
              ? WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return palette.primary;
                  }
                  return palette.text;
                })
              : null,
          side: isIconTheme
              ? WidgetStatePropertyAll(BorderSide(color: palette.outline))
              : null,
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
      iconButtonTheme: isIconTheme
          ? IconButtonThemeData(
              style: ButtonStyle(
                backgroundColor: const WidgetStatePropertyAll(iconGoldSoft),
                foregroundColor: WidgetStatePropertyAll(palette.primary),
                overlayColor: WidgetStatePropertyAll(
                  palette.primary.withValues(alpha: 0.08),
                ),
              ),
            )
          : null,
      chipTheme: isIconTheme
          ? ChipThemeData(
              backgroundColor: palette.surface,
              selectedColor: iconGoldSoft,
              checkmarkColor: palette.primary,
              labelStyle: TextStyle(
                color: palette.text,
                fontWeight: FontWeight.w700,
              ),
              secondaryLabelStyle: TextStyle(
                color: palette.primary,
                fontWeight: FontWeight.w900,
              ),
              side: BorderSide(color: palette.outline),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            )
          : null,
      extensions: [
        VCalendarColors(
          mutedText: palette.muted,
          eventText: palette.eventText,
          ekadashiBorder: iconGold,
          todayMarker: const Color(0xFFE13D35),
          vaishnavaAppearance: palette.vaishnavaAppearance,
          vaishnavaDisappearance: palette.vaishnavaDisappearance,
          festival: palette.festival,
          parana: palette.parana,
        ),
      ],
    );
  }
}

class VCalendarColors extends ThemeExtension<VCalendarColors> {
  const VCalendarColors({
    required this.mutedText,
    required this.eventText,
    required this.ekadashiBorder,
    required this.todayMarker,
    required this.vaishnavaAppearance,
    required this.vaishnavaDisappearance,
    required this.festival,
    required this.parana,
  });

  final Color mutedText;
  final Color eventText;
  final Color ekadashiBorder;
  final Color todayMarker;
  final Color vaishnavaAppearance;
  final Color vaishnavaDisappearance;
  final Color festival;
  final Color parana;

  @override
  VCalendarColors copyWith({
    Color? mutedText,
    Color? eventText,
    Color? ekadashiBorder,
    Color? todayMarker,
    Color? vaishnavaAppearance,
    Color? vaishnavaDisappearance,
    Color? festival,
    Color? parana,
  }) {
    return VCalendarColors(
      mutedText: mutedText ?? this.mutedText,
      eventText: eventText ?? this.eventText,
      ekadashiBorder: ekadashiBorder ?? this.ekadashiBorder,
      todayMarker: todayMarker ?? this.todayMarker,
      vaishnavaAppearance: vaishnavaAppearance ?? this.vaishnavaAppearance,
      vaishnavaDisappearance:
          vaishnavaDisappearance ?? this.vaishnavaDisappearance,
      festival: festival ?? this.festival,
      parana: parana ?? this.parana,
    );
  }

  @override
  VCalendarColors lerp(ThemeExtension<VCalendarColors>? other, double t) {
    if (other is! VCalendarColors) return this;
    return VCalendarColors(
      mutedText: Color.lerp(mutedText, other.mutedText, t)!,
      eventText: Color.lerp(eventText, other.eventText, t)!,
      ekadashiBorder: Color.lerp(ekadashiBorder, other.ekadashiBorder, t)!,
      todayMarker: Color.lerp(todayMarker, other.todayMarker, t)!,
      vaishnavaAppearance: Color.lerp(
        vaishnavaAppearance,
        other.vaishnavaAppearance,
        t,
      )!,
      vaishnavaDisappearance: Color.lerp(
        vaishnavaDisappearance,
        other.vaishnavaDisappearance,
        t,
      )!,
      festival: Color.lerp(festival, other.festival, t)!,
      parana: Color.lerp(parana, other.parana, t)!,
    );
  }
}

class _Palette {
  const _Palette({
    required this.background,
    required this.surface,
    required this.primary,
    required this.onPrimary,
    required this.text,
    required this.muted,
    required this.outline,
    required this.eventText,
    required this.vaishnavaAppearance,
    required this.vaishnavaDisappearance,
    required this.festival,
    required this.parana,
  });

  final Color background;
  final Color surface;
  final Color primary;
  final Color onPrimary;
  final Color text;
  final Color muted;
  final Color outline;
  final Color eventText;
  final Color vaishnavaAppearance;
  final Color vaishnavaDisappearance;
  final Color festival;
  final Color parana;
}
