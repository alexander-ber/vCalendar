export const RULES = {
  rules_version: "v1",
  engine_mode: {
    strict_internal: true,
    external_validation: false
  },
  ekadashi: {
    arunodaya_mode: "previous_night_fraction",
    arunodaya_offset_minutes: 96,
    arunodaya_night_fraction: 1 / 15,
    classification_priority: ["viddha", "double_sunrise", "no_sunrise", "standard"]
  },
  parana: {
    hari_vasara_fraction: 0.25,
    pratah_fraction_of_daylight: 1 / 3
  },
  masa: {
    boundary: "amavasya_to_amavasya",
    sankranti_definition: "sidereal_sun_rashi_change",
    adhika_if_sankranti_count: 0,
    normal_if_sankranti_count: 1,
    kshaya_if_sankranti_count: 2
  }
};
