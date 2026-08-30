import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

class AppDatabase {
  AppDatabase({this.seedAssetPath = 'assets/db/vcalendar_seed.sqlite'});

  final String seedAssetPath;
  Database? _database;

  Future<Database> open() async {
    final existing = _database;
    if (existing != null) return existing;

    final docsDir = await getApplicationDocumentsDirectory();
    final dbPath = p.join(docsDir.path, 'vcalendar.sqlite');
    final signaturePath = p.join(docsDir.path, 'vcalendar.seed.sig');
    final dbFile = File(dbPath);
    final signatureFile = File(signaturePath);

    await dbFile.parent.create(recursive: true);
    final seedBytes = await rootBundle.load(seedAssetPath);
    final seedData = seedBytes.buffer.asUint8List(
      seedBytes.offsetInBytes,
      seedBytes.lengthInBytes,
    );
    final seedSignature = _seedSignature(seedData);
    // Only re-copy when the bundled seed asset itself changed since the
    // last copy (tracked by [signatureFile], written once at copy time).
    // The runtime db file's own byte length is NOT a valid signal here -
    // it legitimately grows/shrinks as soon as anything writes to it (e.g.
    // ContentUpdateService's synced events), which would otherwise trip a
    // false "needs re-copy" on every single launch and silently discard
    // every local write, including all synced content, right after it was
    // written.
    final existingSignature = await signatureFile.exists()
        ? (await signatureFile.readAsString()).trim()
        : '';
    if (!await dbFile.exists() || existingSignature != seedSignature) {
      await dbFile.writeAsBytes(seedData, flush: true);
      await signatureFile.writeAsString(seedSignature, flush: true);
    }

    _database = await openDatabase(dbPath, readOnly: false);
    return _database!;
  }

  String _seedSignature(Uint8List bytes) {
    var hash = 0xcbf29ce484222325;
    for (final byte in bytes) {
      hash ^= byte;
      hash = (hash * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF;
    }
    return '${bytes.length}:${hash.toRadixString(16).padLeft(16, '0')}';
  }

  Future<void> close() async {
    final existing = _database;
    if (existing == null) return;
    _database = null;
    await existing.close();
  }
}
