/**
 * Minimal RFC 4180 CSV writer.
 *
 * Kept dependency-free: conversion errors routinely contain commas, quotes and
 * newlines, and a naive join silently shifts every following column.
 */

/** Quote a single cell when it contains a delimiter, quote or newline. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Serialize rows to a CSV document.
 *
 * Uses CRLF line endings and a UTF-8 BOM so Excel on Windows opens the file
 * with the right encoding instead of mangling non-ASCII error messages.
 */
export function toCsv(rows: Array<Array<unknown>>): string {
  return (
    "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}