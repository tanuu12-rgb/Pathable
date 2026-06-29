export const campusGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "lib", name: "Library", type: "building" },
      geometry: { type: "Polygon", coordinates: [[[-0.1, 51.5], [-0.1, 51.505], [-0.09, 51.505], [-0.09, 51.5], [-0.1, 51.5]]] }
    },
    // Mock buildings and paths...
  ]
};

export const campusPaths = [
  // Mock edges for Dijkstra
];
