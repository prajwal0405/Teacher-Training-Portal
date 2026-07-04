export const CLASS_LEVEL_CONFIG = {
  "Level 1": { className: "PTP", ageGroup: "1-2 years" },
  "Level 2": { className: "PTP", ageGroup: "1-2 years" },
  "Level 3": { className: "Primary", ageGroup: "2-3 years" },
  "Level 4": { className: "Primary", ageGroup: "2-3 years" },
  "Level 5": { className: "Nursery", ageGroup: "3-4 years" },
  "Level 6": { className: "Nursery", ageGroup: "3-4 years" }
};

export const DEFAULT_LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"];

export const normalizeLevel = (value) => {
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/level\s*(\d+)/);
  return match ? `Level ${match[1]}` : String(value || "").trim();
};

export const getClassInfoByLevel = (level) => {
  return CLASS_LEVEL_CONFIG[normalizeLevel(level)] || {
    className: "Unmapped",
    ageGroup: "Unmapped"
  };
};
