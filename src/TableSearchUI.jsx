// TableSearch.jsx
import React, { useState, useEffect, useMemo } from "react";
import { TextField, MenuItem, Box } from "@mui/material";
import _ from "lodash";

/* ================= UTILS ================= */

// normalize text
const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

// debounce hook
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* unwrap backend weird wrappers like {arg:[...]} */
function unwrapRoot(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 1 && Array.isArray(data[keys[0]])) {
      return data[keys[0]];
    }
  }

  return [data];
}

/* deep extract ALL values (for global + dynamic keys) */
function deepExtractValues(obj, result = []) {
  if (obj == null) return result;

  if (typeof obj === "string" || typeof obj === "number") {
    result.push(String(obj));
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => deepExtractValues(item, result));
    return result;
  }

  if (typeof obj === "object") {
    Object.values(obj).forEach((v) => deepExtractValues(v, result));
  }

  return result;
}

/* resolve config-driven paths including dynamic keys */
function resolveValues(obj, path) {
  if (!path) return [];

  // Global search mode
  if (path === "*") {
    return deepExtractValues(obj);
  }

  // Dynamic object keys (charges{}.*.chargeCode)
  if (path.includes("{}.*.")) {
    const [objPath, field] = path.split("{}.*.");
    const objVal = _.get(obj, objPath, {});
    return Object.values(objVal || {}).map((v) => _.get(v, field));
  }

  // Normal array path: charges[].chargeCode
  if (path.includes("[]")) {
    const [arrPath, field] = path.split("[].");
    const arr = _.get(obj, arrPath, []);
    return (arr || []).map((item) => _.get(item, field));
  }

  // Normal lodash path
  const value = _.get(obj, path);
  return Array.isArray(value) ? value : [value];
}

/* ================= COMPONENT ================= */

export function TableSearchUI({
  searchConfig,
  originalTableData,
  onSearchResult,
}) {
  const [selectedKey, setSelectedKey] = useState("*");
  const [keyword, setKeyword] = useState("");

  const debouncedKeyword = useDebounce(keyword, 300);

  // normalize data once
  const dataMemo = useMemo(
    () => unwrapRoot(originalTableData),
    [originalTableData],
  );

  useEffect(() => {
    try {
      if (!debouncedKeyword.trim()) {
        onSearchResult(dataMemo);
        return;
      }

      const keywordNorm = normalize(debouncedKeyword);

      const filtered = dataMemo.filter((row) => {
        const values = resolveValues(row, selectedKey);
        return values.some((v) => normalize(v).includes(keywordNorm));
      });

      onSearchResult(filtered);
    } catch (e) {
      console.log({ e });
    }
  }, [selectedKey, debouncedKeyword, dataMemo]);

  return (
    <Box display="flex" gap={2} mb={2}>
      {/* Dropdown */}
      <TextField
        select
        label="Search By"
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
        size="small"
        sx={{ minWidth: 220 }}
      >
        {searchConfig.map((item) => (
          <MenuItem key={item.valuePath} value={item.valuePath}>
            {item.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Keyword Input */}
      <TextField
        label="Keyword"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        size="small"
      />
    </Box>
  );
}
