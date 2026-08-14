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
    final dbFile = File(dbPath);

    await dbFile.parent.create(recursive: true);
    final seedBytes = await rootBundle.load(seedAssetPath);
    final seedData = seedBytes.buffer.asUint8List(
      seedBytes.offsetInBytes,
      seedBytes.lengthInBytes,
    );
    final seedLength = seedData.length;
    final existingLength = await dbFile.exists() ? await dbFile.length() : -1;
    if (existingLength != seedLength) {
      await dbFile.writeAsBytes(seedData, flush: true);
    }

    _database = await openDatabase(dbPath, readOnly: false);
    return _database!;
  }

  Future<void> close() async {
    final existing = _database;
    if (existing == null) return;
    _database = null;
    await existing.close();
  }
}
