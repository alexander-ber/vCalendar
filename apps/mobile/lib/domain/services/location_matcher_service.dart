import 'package:geolocator/geolocator.dart';

import '../models/calendar_location.dart';

class LocationMatcherService {
  const LocationMatcherService();

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

    return LocationMatchResult(
      location: nearest!,
      latitude: position.latitude,
      longitude: position.longitude,
      distanceMeters: nearestDistanceMeters,
    );
  }
}

class LocationMatchResult {
  const LocationMatchResult({
    required this.location,
    required this.latitude,
    required this.longitude,
    required this.distanceMeters,
  });

  final CalendarLocation location;
  final double latitude;
  final double longitude;
  final double distanceMeters;

  double get distanceKm => distanceMeters / 1000;
}

class LocationMatchException implements Exception {
  const LocationMatchException(this.message);

  final String message;

  @override
  String toString() => message;
}
