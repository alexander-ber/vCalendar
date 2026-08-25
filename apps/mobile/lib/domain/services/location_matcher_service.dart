import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';

import '../models/calendar_location.dart';

class LocationMatcherService {
  LocationMatcherService({http.Client? client})
    : _client = client ?? http.Client();

  final http.Client _client;

  Future<LocationMatchResult> detectNearest(
    List<CalendarLocation> locations,
  ) async {
    if (locations.isEmpty) {
      throw const LocationMatchException('No offline locations are available.');
    }

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationMatchException('Location services are disabled.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const LocationMatchException('Location permission was denied.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationMatchException(
        'Location permission is permanently denied.',
      );
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
      ),
    );

    CalendarLocation? nearest;
    var nearestDistanceMeters = double.infinity;
    for (final location in locations) {
      final distance = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        location.latitude,
        location.longitude,
      );
      if (distance < nearestDistanceMeters) {
        nearest = location;
        nearestDistanceMeters = distance;
      }
    }

    final timezone =
        await _timezoneByCoordinates(position.latitude, position.longitude) ??
        nearest!.timezone;

    return LocationMatchResult(
      location: nearest!,
      latitude: position.latitude,
      longitude: position.longitude,
      timezone: timezone,
      timezoneFromNearestLocation: timezone == nearest.timezone,
      distanceMeters: nearestDistanceMeters,
    );
  }

  Future<String?> _timezoneByCoordinates(
    double latitude,
    double longitude,
  ) async {
    final uri = Uri.https('timeapi.io', '/api/TimeZone/coordinate', {
      'latitude': latitude.toStringAsFixed(6),
      'longitude': longitude.toStringAsFixed(6),
    });
    try {
      final response = await _client
          .get(uri)
          .timeout(const Duration(seconds: 5));
      if (response.statusCode < 200 || response.statusCode >= 300) return null;
      final payload = jsonDecode(response.body);
      final timezone = payload is Map ? payload['timeZone'] : null;
      if (timezone is String && timezone.trim().isNotEmpty) {
        return timezone.trim();
      }
    } catch (_) {
      return null;
    }
    return null;
  }
}

class LocationMatchResult {
  const LocationMatchResult({
    required this.location,
    required this.latitude,
    required this.longitude,
    required this.timezone,
    required this.timezoneFromNearestLocation,
    required this.distanceMeters,
  });

  final CalendarLocation location;
  final double latitude;
  final double longitude;
  final String timezone;
  final bool timezoneFromNearestLocation;
  final double distanceMeters;

  double get distanceKm => distanceMeters / 1000;
}

class LocationMatchException implements Exception {
  const LocationMatchException(this.message);

  final String message;

  @override
  String toString() => message;
}
