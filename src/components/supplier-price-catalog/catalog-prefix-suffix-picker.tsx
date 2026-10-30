"use client";

import { useMemo, useState } from "react";
import Label from "@/components/template-components/form/Label";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import { Modal } from "@/components/ui/modal";
import { useSuffixListQuery } from "@/hooks/queries/useSuffixManagementQuery";
import { AlertCircle, ClipboardList, Loader2, Search } from "@/lib/icons/lucide";
import {
  catalogSelectionToPrefixes,
  filterFordSuffixRows,
  filterNonFordSuffixRows,
  FORD_ZGROUP_CODE,
  type CatalogPrefixMode,
  type CatalogPrefixSelection,
} from "@/lib/supplier-price-catalog/prefix-selection";
import type { SuffixRow } from "@/lib/suffix-management/types";

const selectClassName =
  "h-10 min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

type CatalogPrefixSuffixPickerProps = {
  value: CatalogPrefixSelection;
  onChange: (next: CatalogPrefixSelection) => void;
  disabled?: boolean;
};

function modeButtonClassName(active: boolean) {
  return [
    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
    active
      ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs"
      : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-500/40",
  ].join(" ");
}

function suffixRowMatchesSearch(row: SuffixRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    row.SOSUFIX,
    row.NAME,
    row.ZGROUP_CODE,
    row.SUPPLIER_NAME,
    row.SUPPLIER_CODE,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function SuffixRowDetails({ row }: { row: SuffixRow }) {
  const inactive = row.ISACTIVE !== 1;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
          {row.SOSUFIX}
        </span>
        {row.ZGROUP_CODE ? (
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {row.ZGROUP_CODE.trim()}
          </span>
        ) : null}
        {inactive ? (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            Ανενεργό
          </span>
        ) : null}
      </div>
      {row.NAME?.trim() ? (
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
          {row.NAME.trim()}
        </p>
      ) : null}
    </>
  );
}

export default function CatalogPrefixSuffixPicker({
  value,
  onChange,
  disabled = false,
}: CatalogPrefixSuffixPickerProps) {
  const [search, setSearch] = useState("");
  const [fordSearch, setFordSearch] = useState("");
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [fordModalOpen, setFordModalOpen] = useState(false);
  const shouldLoadSuffixList =
    otherModalOpen ||
    fordModalOpen ||
    value.mode === "other" ||
    value.mode === "ford";
  const query = useSuffixListQuery({}, { enabled: shouldLoadSuffixList });

  const fordSuffixes = useMemo(
    () => filterFordSuffixRows(query.data?.sufix ?? []),
    [query.data?.sufix]
  );

  const nonFordSuffixes = useMemo(
    () => filterNonFordSuffixRows(query.data?.sufix ?? []),
    [query.data?.sufix]
  );

  const filteredSuffixes = useMemo(
    () => nonFordSuffixes.filter((row) => suffixRowMatchesSearch(row, search)),
    [nonFordSuffixes, search]
  );

  const filteredFordSuffixes = useMemo(
    () => fordSuffixes.filter((row) => suffixRowMatchesSearch(row, fordSearch)),
    [fordSuffixes, fordSearch]
  );

  const selectedOtherSuffixes = value.mode === "other" ? value.sosufix : [];
  const selectedFordSuffixes = value.mode === "ford" ? value.sosufix : [];
  const otherSelectedSet = useMemo(
    () => new Set(selectedOtherSuffixes),
    [selectedOtherSuffixes]
  );
  const fordSelectedSet = useMemo(
    () => new Set(selectedFordSuffixes),
    [selectedFordSuffixes]
  );

  const encodedValue = catalogSelectionToPrefixes(value);
  const otherInlinePreview = selectedOtherSuffixes.slice(0, 8);
  const otherHiddenCount = Math.max(
    0,
    selectedOtherSuffixes.length - otherInlinePreview.length
  );
  const fordInlinePreview = selectedFordSuffixes.slice(0, 8);
  const fordHiddenCount = Math.max(
    0,
    selectedFordSuffixes.length - fordInlinePreview.length
  );

  const openOtherMode = () => {
    onChange({
      mode: "other",
      sosufix: value.mode === "other" ? value.sosufix : [],
    });
    setOtherModalOpen(true);
  };

  const setMode = (mode: CatalogPrefixMode) => {
    if (mode === "ford") {
      setOtherModalOpen(false);
      setFordModalOpen(false);
      onChange({
        mode: "ford",
        sosufix: value.mode === "ford" ? value.sosufix : [],
      });
      return;
    }

    setFordModalOpen(false);
    openOtherMode();
  };

  const toggleOtherSuffix = (sosufix: string) => {
    if (value.mode !== "other") return;

    if (value.sosufix.includes(sosufix)) {
      onChange({
        mode: "other",
        sosufix: value.sosufix.filter((entry) => entry !== sosufix),
      });
      return;
    }

    onChange({ mode: "other", sosufix: [...value.sosufix, sosufix] });
  };

  const toggleFordSuffix = (sosufix: string) => {
    if (value.mode !== "ford") return;

    if (value.sosufix.includes(sosufix)) {
      onChange({
        mode: "ford",
        sosufix: value.sosufix.filter((entry) => entry !== sosufix),
      });
      return;
    }

    onChange({ mode: "ford", sosufix: [...value.sosufix, sosufix] });
  };

  const clearOtherSelection = () => {
    if (value.mode !== "other") return;
    onChange({ mode: "other", sosufix: [] });
  };

  const clearFordSelection = () => {
    if (value.mode !== "ford") return;
    onChange({ mode: "ford", sosufix: [] });
  };

  const closeOtherModal = () => {
    setOtherModalOpen(false);
    setSearch("");
  };

  const closeFordModal = () => {
    setFordModalOpen(false);
    setFordSearch("");
  };

  const suffixListLoading = query.isLoading;
  const suffixListError = query.isError;

  return (
    <div className="md:col-span-2 space-y-4">
      <div>
        <Label>Ομάδα κωδικών (ZGROUP)</Label>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Επιλέξτε FORD για prefixes ή «Άλλα» για πολλαπλά suffix (SOSUFIX).
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            className={modeButtonClassName(value.mode === "ford")}
            onClick={() => setMode("ford")}
          >
            {FORD_ZGROUP_CODE}
          </button>
          <button
            type="button"
            disabled={disabled}
            className={modeButtonClassName(value.mode === "other")}
            onClick={() => setMode("other")}
          >
            Άλλα
          </button>
        </div>
      </div>

      {value.mode === "ford" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-4 dark:border-brand-500/20 dark:bg-brand-500/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Prefixes
            </p>
            {fordSelectedSet.size > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {fordInlinePreview.map((sosufix) => (
                  <span
                    key={sosufix}
                    className="inline-flex rounded-lg border border-brand-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    {sosufix}
                  </span>
                ))}
                {fordHiddenCount > 0 ? (
                  <span className="text-xs font-medium text-brand-700/80 dark:text-brand-300/90">
                    +{fordHiddenCount} ακόμα
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                Θα χρησιμοποιηθεί η ομάδα{" "}
                <span className="font-mono text-brand-700 dark:text-brand-300">
                  {FORD_ZGROUP_CODE}
                </span>
              </p>
            )}
            {!suffixListLoading && !suffixListError ? (
              <p className="mt-1 text-xs text-brand-700/80 dark:text-brand-300/90">
                {fordSuffixes.length} suffix στην ομάδα {FORD_ZGROUP_CODE}
                {fordSelectedSet.size > 0
                  ? ` · ${fordSelectedSet.size} επιλεγμένα`
                  : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setFordModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-200 dark:hover:bg-brand-500/10"
          >
            <ClipboardList className="h-4 w-4" />
            {fordSelectedSet.size > 0
              ? "Αλλαγή επιλογής"
              : `Επιλογή suffix ${FORD_ZGROUP_CODE}`}
          </button>
        </div>
      ) : null}

      {value.mode === "other" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Suffix
            </p>
            {otherSelectedSet.size > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {otherInlinePreview.map((sosufix) => (
                  <span
                    key={sosufix}
                    className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    {sosufix}
                  </span>
                ))}
                {otherHiddenCount > 0 ? (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    +{otherHiddenCount} ακόμα
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Δεν έχει επιλεγεί suffix.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={openOtherMode}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
          >
            <ClipboardList className="h-4 w-4" />
            {otherSelectedSet.size > 0 ? "Αλλαγή επιλογής" : "Επιλογή suffix"}
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Τιμή για ανέβασμα (prefixes)
        </p>
        <p className="mt-1 break-all font-mono text-sm text-gray-800 dark:text-gray-100">
          {encodedValue || "—"}
        </p>
        {value.mode === "other" && otherSelectedSet.size === 0 ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Επιλέξτε τουλάχιστον ένα suffix για να συνεχίσετε.
          </p>
        ) : null}
      </div>

      <Modal
        isOpen={otherModalOpen}
        onClose={closeOtherModal}
        className="m-4 flex h-[min(90vh,42rem)] max-w-2xl flex-col !overflow-hidden"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-gray-100 p-6 pb-4 dark:border-gray-800">
            <p className="pr-10 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Τιμοκατάλογος
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {nonFordSuffixes.length} διαθέσιμα · {otherSelectedSet.size} επιλεγμένα
            </p>

            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={disabled}
                placeholder="Αναζήτηση SOSUFIX, ομάδας ή προμηθευτή..."
                className={`${selectClassName} h-10 w-full pl-9`}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {query.isLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                Φόρτωση suffix από το ERP...
              </div>
            ) : null}

            {query.isError ? (
              <div className="mx-6 my-6 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {query.error instanceof Error
                    ? query.error.message
                    : "Αποτυχία φόρτωσης suffix."}
                </span>
              </div>
            ) : null}

            {!query.isLoading && !query.isError ? (
              filteredSuffixes.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  Δεν βρέθηκαν εγγραφές suffix.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSuffixes.map((row) => {
                    const checked = otherSelectedSet.has(row.SOSUFIX);

                    return (
                      <li
                        key={row.SOSUFIX}
                        className={[
                          "flex items-center gap-3 px-6 py-3 transition",
                          checked
                            ? "bg-brand-50/80 dark:bg-brand-500/10"
                            : "hover:bg-gray-50 dark:hover:bg-gray-900/60",
                          disabled ? "opacity-60" : "",
                        ].join(" ")}
                      >
                        <DataTableSelectionCheckbox
                          checked={checked}
                          onCheckedChange={() => toggleOtherSuffix(row.SOSUFIX)}
                          ariaLabel={`Επιλογή suffix ${row.SOSUFIX}`}
                          disabled={disabled}
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleOtherSuffix(row.SOSUFIX)}
                          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                        >
                          <SuffixRowDetails row={row} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-gray-800 sm:px-6">
            <button
              type="button"
              disabled={disabled || otherSelectedSet.size === 0}
              onClick={clearOtherSelection}
              className="text-sm font-semibold text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Καθαρισμός
            </button>
            <button
              type="button"
              onClick={closeOtherModal}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              Έτοιμο
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={fordModalOpen}
        onClose={closeFordModal}
        className="m-4 flex h-[min(90vh,42rem)] max-w-2xl flex-col !overflow-hidden"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-gray-100 p-6 pb-4 dark:border-gray-800">
            <p className="pr-10 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Τιμοκατάλογος
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {fordSuffixes.length} διαθέσιμα · {fordSelectedSet.size} επιλεγμένα
              {fordSelectedSet.size === 0
                ? ` · χωρίς επιλογή χρησιμοποιείται ${FORD_ZGROUP_CODE}`
                : ""}
            </p>

            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={fordSearch}
                onChange={(event) => setFordSearch(event.target.value)}
                disabled={disabled}
                placeholder="Αναζήτηση SOSUFIX ή προμηθευτή..."
                className={`${selectClassName} h-10 w-full pl-9`}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {suffixListLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                Φόρτωση suffix από το ERP...
              </div>
            ) : null}

            {suffixListError ? (
              <div className="mx-6 my-6 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {query.error instanceof Error
                    ? query.error.message
                    : "Αποτυχία φόρτωσης suffix."}
                </span>
              </div>
            ) : null}

            {!suffixListLoading && !suffixListError ? (
              filteredFordSuffixes.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  Δεν βρέθηκαν εγγραφές suffix για {FORD_ZGROUP_CODE}.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredFordSuffixes.map((row) => {
                    const checked = fordSelectedSet.has(row.SOSUFIX);

                    return (
                      <li
                        key={row.SOSUFIX}
                        className={[
                          "flex items-center gap-3 px-6 py-3 transition",
                          checked
                            ? "bg-brand-50/80 dark:bg-brand-500/10"
                            : "hover:bg-gray-50 dark:hover:bg-gray-900/60",
                          disabled ? "opacity-60" : "",
                        ].join(" ")}
                      >
                        <DataTableSelectionCheckbox
                          checked={checked}
                          onCheckedChange={() => toggleFordSuffix(row.SOSUFIX)}
                          ariaLabel={`Επιλογή suffix ${row.SOSUFIX}`}
                          disabled={disabled}
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleFordSuffix(row.SOSUFIX)}
                          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                        >
                          <SuffixRowDetails row={row} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-gray-800 sm:px-6">
            <button
              type="button"
              disabled={disabled || fordSelectedSet.size === 0}
              onClick={clearFordSelection}
              className="text-sm font-semibold text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Καθαρισμός
            </button>
            <button
              type="button"
              onClick={closeFordModal}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              Έτοιμο
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
