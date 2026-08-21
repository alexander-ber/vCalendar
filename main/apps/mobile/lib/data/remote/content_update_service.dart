import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:sqflite/sqflite.dart';

import '../local/app_database.dart';

class ContentUpdateService {
  ContentUpdateService(
    this._database, {
    http.Client? client,
    this.manifestUrl = defaultManifestUrl,
  }) : _client = client ?? http.Client();

  static const defaultManifestUrl =
      'https://raw.githubusercontent.com/alexander-ber/vCalendar/main/i18n/manifest.json';

  static const supportedSchemaVersion = 1;

  final AppDatabase _database;
  final http.Client _client;
  final String manifestUrl;

  Future<ContentUpdateResult> checkAndInstall() async {
    final checkedAt = DateTime.now().toUtc();
    final manifest = await _downloadJson(Uri.parse(manifestUrl));
    final schemaVersion = (manifest['schema_version'] as num?)?.toInt() ?? 1;
    if (schemaVersion > supportedSchemaVersion) {
      return ContentUpdateResult(
        checkedAt: checkedAt,
        installedFiles: 0,
        skippedFiles: 0,
        message: 'Unsupported content manifest schema: $schemaVersion.',
      );
    }

    final languages = (manifest['languages'] as List? ?? const [])
        .whereType<Map<String, Object?>>()
        .toList(growable: false);
    if (languages.isEmpty) {
      return ContentUpdateResult(
        checkedAt: checkedAt,
        installedFiles: 0,
        skippedFiles: 0,
        message: 'No language packs were found in the manifest.',
      );
    }

    final db = await _database.open();
    var installed = 0;
    var skipped = 0;
    final importedLangs = <String>{};

    for (final language in languages) {
      final lang = language['lang'] as String?;
      final version = (language['version'] as num?)?.toInt();
      final requiredSchema =
          (language['required_app_schema'] as num?)?.toInt() ?? 1;
      final files = language['files'] as Map?;
      if (lang == null || version == null || files == null) {
        skipped += 1;
        continue;
      }
      if (requiredSchema > supportedSchemaVersion) {
        skipped += files.length;
        continue;
      }

      for (final entry in files.entries) {
        final kind = entry.key.toString();
        final path = entry.value.toString();
        final localVersion = await _contentPackVersion(db, lang, kind);
        if (localVersion >= version) {
          skipped += 1;
          continue;
        }

        final fileUrl = _resolvePackUrl(path);
        final payload = await _downloadJson(fileUrl);
        final rows = await db.transaction((txn) async {
          final appliedRows = await _importPack(
            txn,
            lang: lang,
            kind: kind,
            payload: payload,
          );
          await txn.insert('content_packs', {
            'lang': lang,
            'pack_kind': kind,
            'version': version,
            'source': 'remote',
            'source_url': fileUrl.toString(),
            'checksum': payload['checksum'] as String?,
            'installed_at': checkedAt.toIso8601String(),
            'is_builtin': 0,
            'is_active': 1,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
          return appliedRows;
        });
        installed += 1;
        if (rows > 0) importedLangs.add(lang);
      }
    }

    final langList = importedLangs.toList()..sort();
    return ContentUpdateResult(
      checkedAt: checkedAt,
      installedFiles: installed,
      skippedFiles: skipped,
      message: installed == 0
          ? 'Content is already up to date.'
          : 'Installed $installed content pack file(s): ${langList.join(', ')}.',
    );
  }

  Uri _resolvePackUrl(String path) {
    final uri = Uri.tryParse(path);
    if (uri != null && uri.hasScheme) return uri;

    final manifest = Uri.parse(manifestUrl);
    final manifestText = manifest.toString();
    if (manifestText.endsWith('/i18n/manifest.json')) {
      return Uri.parse(
        '${manifestText.substring(0, manifestText.length - '/i18n/manifest.json'.length)}/$path',
      );
    }
    return manifest.resolve(path);
  }

  Future<Map<String, Object?>> _downloadJson(Uri url) async {
    final response = await _client.get(url);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ContentUpdateException(
        'Cannot download ${url.toString()} (${response.statusCode}).',
      );
    }
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (decoded is! Map<String, Object?>) {
      throw ContentUpdateException('Invalid JSON object at ${url.toString()}.');
    }
    return decoded;
  }

  Future<int> _contentPackVersion(Database db, String lang, String kind) async {
    final rows = await db.query(
      'content_packs',
      columns: ['version'],
      where: 'lang = ? and pack_kind = ? and is_active = 1',
      whereArgs: [lang, kind],
      limit: 1,
    );
    if (rows.isEmpty) return 0;
    return (rows.first['version'] as num?)?.toInt() ?? 0;
  }

  Future<int> _importPack(
    Transaction txn, {
    required String lang,
    required String kind,
    required Map<String, Object?> payload,
  }) {
    return switch (kind) {
      'ui' => _importUi(txn, lang, payload),
      'events' => _importEvents(txn, lang, payload),
      'ekadashi' => _importEkadashi(txn, lang, payload),
      'glossary' => _importGlossary(txn, lang, payload),
      'locations' => _importLocations(txn, lang, payload),
      _ => Future.value(0),
    };
  }

  Future<int> _importUi(
    Transaction txn,
    String lang,
    Map<String, Object?> payload,
  ) async {
    final strings = payload['strings'];
    final map = strings is Map ? strings : payload;
    var rows = 0;
    for (final entry in map.entries) {
      if (entry.value is! String) continue;
      await txn.insert('ui_strings', {
        'lang': lang,
        'key': entry.key.toString(),
        'value': entry.value,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      rows += 1;
    }
    return rows;
  }

  Future<int> _importEvents(
    Transaction txn,
    String lang,
    Map<String, Object?> payload,
  ) async {
    final events = _listFrom(payload, 'events');
    var rows = 0;
    for (final item in events) {
      final id = item['id'] as String?;
      if (id == null || id.trim().isEmpty) continue;
      await _upsertEventRuleIfPresent(txn, item);
      rows += await _upsertEventI18n(txn, id, lang, item);
    }
    return rows;
  }

  Future<void> _upsertEventRuleIfPresent(
    Transaction txn,
    Map<String, Object?> item,
  ) async {
    final id = item['id'] as String?;
    final category = item['category'] as String?;
    final eventType = item['event_type'] as String?;
    if (id == null || category == null || eventType == null) return;

    await txn.insert('events', {
      'id': id,
      'category': category,
      'event_type': eventType,
      'scope': item['scope'] as String?,
      'subject': item['subject'] as String?,
      'masa': item['masa'] as String?,
      'paksha': item['paksha'] as String?,
      'tithi': item['tithi'] as String?,
      'naksatra': item['naksatra'] as String?,
      'timing_rule': item['timing_rule'] as String?,
      'fasting_rule': item['fasting_rule'] as String?,
      'allow_in_adhika': _boolInt(item['allow_in_adhika']),
      'priority': (item['priority'] as num?)?.toInt() ?? 100,
      'source_status': item['source_status'] as String? ?? 'confirmed',
      'source_url': item['source_url'] as String?,
      'source_note': item['source_note'] as String?,
      'raw_json': jsonEncode(item),
      'created_at': item['created_at'] as String?,
      'updated_at':
          item['updated_at'] as String? ??
          DateTime.now().toUtc().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> _upsertEventI18n(
    Transaction txn,
    String eventId,
    String fallbackLang,
    Map<String, Object?> item,
  ) async {
    final translations = item['translations'];
    if (translations is List) {
      var rows = 0;
      for (final translation
          in translations.whereType<Map<String, Object?>>()) {
        rows += await _insertEventI18n(
          txn,
          eventId,
          translation['lang'] as String? ?? fallbackLang,
          translation,
        );
      }
      return rows;
    }
    return _insertEventI18n(
      txn,
      eventId,
      item['lang'] as String? ?? fallbackLang,
      item,
    );
  }

  Future<int> _insertEventI18n(
    Transaction txn,
    String eventId,
    String lang,
    Map<String, Object?> item,
  ) async {
    final name = item['name'] as String?;
    if (name == null || name.trim().isEmpty) return 0;
    await txn.insert('event_i18n', {
      'event_id': eventId,
      'lang': lang,
      'name': name,
      'short_description': item['short_description'] as String?,
      'full_description': item['full_description'] as String?,
      'source_url': item['source_url'] as String?,
      'translator_note': item['translator_note'] as String?,
      'updated_at':
          item['updated_at'] as String? ??
          DateTime.now().toUtc().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
    return 1;
  }

  Future<int> _importEkadashi(
    Transaction txn,
    String lang,
    Map<String, Object?> payload,
  ) async {
    final items = _listFrom(payload, 'ekadashi');
    var rows = 0;
    for (final item in items) {
      final id = item['id'] as String?;
      final name = item['name'] as String?;
      if (id == null || name == null) continue;
      await txn.insert('ekadashi_i18n', {
        'ekadashi_id': id,
        'lang': item['lang'] as String? ?? lang,
        'name': name,
        'benefits': item['benefits'] as String?,
        'story': item['story'] as String?,
        'full_description': item['full_description'] as String?,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      rows += 1;
    }
    return rows;
  }

  Future<int> _importGlossary(
    Transaction txn,
    String lang,
    Map<String, Object?> payload,
  ) async {
    final items = _listFrom(payload, 'terms');
    var rows = 0;
    for (final item in items) {
      final id = item['id'] as String?;
      final title = item['title'] as String?;
      if (id == null || title == null) continue;
      await txn.insert('glossary_i18n', {
        'term_id': id,
        'lang': item['lang'] as String? ?? lang,
        'title': title,
        'short_description': item['short_description'] as String? ?? '',
        'full_description': item['full_description'] as String?,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      rows += 1;
    }
    return rows;
  }

  Future<int> _importLocations(
    Transaction txn,
    String lang,
    Map<String, Object?> payload,
  ) async {
    final items = _listFrom(payload, 'locations');
    var rows = 0;
    for (final item in items) {
      final id = item['id'] as String?;
      final name = item['name'] as String?;
      if (id == null || name == null) continue;
      await txn.insert('location_i18n', {
        'location_id': id,
        'lang': item['lang'] as String? ?? lang,
        'name': name,
        'country_name': item['country_name'] as String?,
        'region_name': item['region_name'] as String?,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      rows += 1;
    }
    return rows;
  }

  List<Map<String, Object?>> _listFrom(
    Map<String, Object?> payload,
    String key,
  ) {
    final value = payload[key] ?? payload['items'];
    if (value is! List) return const [];
    return value.whereType<Map<String, Object?>>().toList(growable: false);
  }

  int _boolInt(Object? value) {
    if (value is bool) return value ? 1 : 0;
    if (value is num) return value == 0 ? 0 : 1;
    return 0;
  }
}

class ContentUpdateResult {
  const ContentUpdateResult({
    required this.checkedAt,
    required this.installedFiles,
    required this.skippedFiles,
    required this.message,
  });

  final DateTime checkedAt;
  final int installedFiles;
  final int skippedFiles;
  final String message;
}

class ContentUpdateException implements Exception {
  const ContentUpdateException(this.message);

  final String message;

  @override
  String toString() => message;
}
