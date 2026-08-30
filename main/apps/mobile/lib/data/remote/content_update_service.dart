import 'dart:convert';

import 'package:crypto/crypto.dart';
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

  /// Events aren't a per-language pack: `data/events.json` is the single
  /// source of truth already consumed as-is (including raw_json) by
  /// scripts/build-mobile-db.mjs at seed-build time. This sentinel `lang`
  /// value marks the corresponding [content_packs] row, which is gated by
  /// content hash rather than a manually-bumped version number.
  static const _eventsPackLang = '*';
  static const _eventsPackKind = 'events';

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

    final db = await _database.open();
    var installed = 0;
    var skipped = 0;
    final importedLangs = <String>{};

    final eventsSource = manifest['events_source'];
    if (eventsSource is Map) {
      final path = eventsSource['path'];
      if (path is String) {
        final result = await _syncEvents(db, path, checkedAt);
        if (result.applied) {
          installed += 1;
          if (result.rows > 0) importedLangs.add('events');
        } else {
          skipped += 1;
        }
      }
    }

    final languages = (manifest['languages'] as List? ?? const [])
        .whereType<Map<String, Object?>>()
        .toList(growable: false);

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

  /// Downloads `data/events.json` verbatim, and only touches the database
  /// when its content hash differs from what's already installed - no
  /// separately-normalized pack to drift out of sync with the seed builder.
  Future<_EventsSyncResult> _syncEvents(
    Database db,
    String path,
    DateTime checkedAt,
  ) async {
    final url = _resolvePackUrl(path);
    final response = await _client.get(url);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ContentUpdateException(
        'Cannot download ${url.toString()} (${response.statusCode}).',
      );
    }
    final bytes = response.bodyBytes;
    final checksum = sha256.convert(bytes).toString();

    final existingRows = await db.query(
      'content_packs',
      columns: ['checksum', 'version'],
      where: 'lang = ? and pack_kind = ? and is_active = 1',
      whereArgs: [_eventsPackLang, _eventsPackKind],
      limit: 1,
    );
    final existingChecksum = existingRows.isEmpty
        ? null
        : existingRows.first['checksum'] as String?;
    if (existingChecksum == checksum) {
      return const _EventsSyncResult(applied: false, rows: 0);
    }
    final nextVersion = existingRows.isEmpty
        ? 1
        : ((existingRows.first['version'] as num?)?.toInt() ?? 0) + 1;

    final decoded = jsonDecode(utf8.decode(bytes));
    if (decoded is! List) {
      throw ContentUpdateException('Invalid JSON array at ${url.toString()}.');
    }
    final items = decoded.whereType<Map>().toList(growable: false);

    final rows = await db.transaction((txn) async {
      var count = 0;
      for (final item in items) {
        final id = item['id'];
        if (id is! String || id.trim().isEmpty) continue;
        await _upsertEventFromSource(txn, id, item);
        for (final lang in const ['en', 'ru']) {
          await _upsertEventI18nFromSource(txn, id, lang, item);
        }
        count += 1;
      }
      await txn.insert('content_packs', {
        'lang': _eventsPackLang,
        'pack_kind': _eventsPackKind,
        'version': nextVersion,
        'source': 'remote',
        'source_url': url.toString(),
        'checksum': checksum,
        'installed_at': checkedAt.toIso8601String(),
        'is_builtin': 0,
        'is_active': 1,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      return count;
    });

    return _EventsSyncResult(applied: true, rows: rows);
  }

  /// Mirrors scripts/build-mobile-db.mjs's `normalizeEvent`: the same
  /// top-level-or-`rules.*` fallback chain used when building the seed, so
  /// a server-synced event is derived exactly like a seeded one - not a
  /// second, differently-shaped interpretation of the same source object.
  Future<void> _upsertEventFromSource(
    Transaction txn,
    String id,
    Map item,
  ) async {
    final rules = item['rules'] is Map ? item['rules'] as Map : const {};
    String? pick(String key) {
      final direct = item[key];
      if (direct is String) return direct;
      final nested = rules[key];
      if (nested is String) return nested;
      return null;
    }

    await txn.insert('events', {
      'id': id,
      'category': (item['category'] as String?) ?? 'event',
      'event_type':
          (item['type'] as String?) ?? (item['event_type'] as String?) ?? 'event',
      'scope': item['scope'] as String?,
      'subject': item['subject'] as String?,
      'masa': pick('masa') ?? pick('gaudiya_masa'),
      'paksha': pick('paksha'),
      'tithi': pick('tithi'),
      'naksatra': pick('naksatra') ?? pick('nakshatra'),
      'timing_rule': pick('timing_rule'),
      'fasting_rule': pick('fasting_rule'),
      'allow_in_adhika': _boolInt(
        item['allow_in_adhika'] ?? rules['allow_in_adhika'],
      ),
      'priority': _priorityValue(item['priority']),
      'source_status': (item['source_status'] as String?) ?? 'confirmed',
      'source_url': item['source_url'] as String?,
      'source_note': item['source_note'] as String?,
      'raw_json': jsonEncode(item),
      'created_at': item['created_at'] as String?,
      'updated_at':
          item['updated_at'] as String? ??
          DateTime.now().toUtc().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> _upsertEventI18nFromSource(
    Transaction txn,
    String eventId,
    String lang,
    Map item,
  ) async {
    final i18n = item['i18n'] is Map ? item['i18n'] as Map : const {};
    final translation = i18n[lang] is Map ? i18n[lang] as Map : const {};
    final name =
        (translation['name'] as String?) ?? (item['name'] as String?) ?? eventId;
    final description =
        (translation['description'] as String?) ??
        (translation['short_description'] as String?) ??
        (item['description'] as String?);
    final fullDescription =
        (translation['full_description'] as String?) ??
        (item['full_description'] as String?);
    await txn.insert('event_i18n', {
      'event_id': eventId,
      'lang': lang,
      'name': name,
      'short_description': description,
      'full_description': fullDescription,
      'source_url':
          (translation['source_url'] as String?) ?? (item['source_url'] as String?),
      'translator_note': translation['translator_note'] as String?,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  int _priorityValue(Object? priority) {
    if (priority is num) return priority.toInt();
    const map = {'highest': 10, 'high': 25, 'medium': 50, 'low': 75};
    return map[priority] ?? 100;
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

class _EventsSyncResult {
  const _EventsSyncResult({required this.applied, required this.rows});

  final bool applied;
  final int rows;
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
