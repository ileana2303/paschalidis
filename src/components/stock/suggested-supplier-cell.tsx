"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSearchSuppliersMutation } from "@/hooks/queries/useApiMutations";
import { useSaveSuffixMutation } from "@/hooks/queries/useSuffixManagementQuery";
import {
  Check,
  Loader2,
  Pencil,
  Search,
  Truck,
  X,
} from "@/lib/icons/lucide";
import type { ISupplierRow } from "@/lib/interface";
import { getSuffixSaveOutcome } from "@/lib/suffix-management/save-result";

export interface CompanyStockSuggestedSupplier {
  trdr: string;
  code: string;
  name: string;
}

interface SuggestedSupplierCellProps {
  suffix: string;
  persistedSupplier: CompanyStockSuggestedSupplier;
  value: CompanyStockSuggestedSupplier;
  disabled?: boolean;
  onChange: (supplier: CompanyStockSuggestedSupplier) => void;
  onSaved: (supplier: CompanyStockSuggestedSupplier) => void | Promise<void>;
}

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function suppliersMatch(
  first: CompanyStockSuggestedSupplier,
  second: CompanyStockSuggestedSupplier
) {
  return (
    normalize(first.trdr) === normalize(second.trdr) &&
    normalize(first.code) === normalize(second.code) &&
    normalize(first.name) === normalize(second.name)
  );
}

function supplierFromSearchResult(
  supplier: ISupplierRow
): CompanyStockSuggestedSupplier {
  return {
    trdr: normalize(supplier.TRDR),
    code: normalize(supplier.CODE),
    name: normalize(supplier.NAME),
  };
}

export default function SuggestedSupplierCell({
  suffix,
  persistedSupplier,
  value,
  disabled = false,
  onChange,
  onSaved,
}: SuggestedSupplierCellProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ISupplierRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [saveError, setSaveError] = useState("");
  const searchRequestId = useRef(0);
  const { mutateAsync: searchSuppliers, isPending: searching } =
    useSearchSuppliersMutation();
  const { mutateAsync: saveSuffix, isPending: saving } =
    useSaveSuffixMutation();
  const hasTemporaryChange = useMemo(
    () => !suppliersMatch(value, persistedSupplier),
    [persistedSupplier, value]
  );
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!editing || trimmedQuery.length < 3) {
      return;
    }

    const requestId = ++searchRequestId.current;
    const timeoutId = window.setTimeout(() => {
      setSearchError("");

      void searchSuppliers(trimmedQuery)
        .then((response) => {
          if (searchRequestId.current === requestId) {
            setResults(response.rows ?? []);
            setHasSearched(true);
          }
        })
        .catch((error: unknown) => {
          if (searchRequestId.current !== requestId) return;

          setResults([]);
          setHasSearched(true);
          setSearchError(
            error instanceof Error
              ? error.message
              : "Αποτυχία αναζήτησης προμηθευτών."
          );
        });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [editing, searchSuppliers, trimmedQuery]);

  const handleQueryChange = (nextQuery: string) => {
    searchRequestId.current += 1;
    setQuery(nextQuery);
    setResults([]);
    setHasSearched(false);
    setSearchError("");
    setSaveError("");
  };

  const handleSelect = (supplier: ISupplierRow) => {
    onChange(supplierFromSearchResult(supplier));
    setEditing(false);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError("");
    setSaveError("");
  };

  const handleRevert = () => {
    onChange(persistedSupplier);
    setSaveError("");
  };

  const handleToggleEditing = () => {
    if (editing) {
      searchRequestId.current += 1;
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setSearchError("");
    }

    setEditing((current) => !current);
  };

  const handleSave = async () => {
    const normalizedSuffix = normalize(suffix);

    if (!hasTemporaryChange || saving) return;

    if (!normalizedSuffix) {
      const message = "Δεν υπάρχει suffix για αποθήκευση του προμηθευτή.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    try {
      setSaveError("");
      const response = await saveSuffix({
        rows: [
          {
            SOSUFIX: normalizedSuffix,
            SUGGESTED_TRDR: value.trdr,
            SUGGESTED_TRDR_CODE: value.code,
            SUGGESTED_TRDR_NAME: value.name,
          },
        ],
      });
      const outcome = getSuffixSaveOutcome(response);

      if (outcome.saved > 0) {
        await onSaved(value);
      }

      if (outcome.completed) {
        toast.success("Ο προτεινόμενος προμηθευτής αποθηκεύτηκε.");
        return;
      }

      setSaveError(outcome.message);
      toast.error(outcome.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Η αποθήκευση του προμηθευτή δεν ολοκληρώθηκε.";
      setSaveError(message);
      toast.error(message);
    }
  };

  return (
    <div className="relative min-w-0">
      <div
        className="min-w-0 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-2 dark:border-brand-500/20 dark:bg-brand-500/10"
        title={value.name || undefined}
      >
        <div className="flex min-w-0 items-start gap-2">
          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
              {value.name || "—"}
            </p>
            <p className="mt-1 truncate text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
              TRDR{" "}
              <strong className="font-semibold text-gray-700 dark:text-gray-200">
                {value.trdr || "—"}
              </strong>
              <span className="px-1 text-brand-300 dark:text-brand-500">·</span>
              Κωδ.{" "}
              <strong className="font-semibold text-gray-700 dark:text-gray-200">
                {value.code || "—"}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleEditing}
            disabled={disabled || saving}
            title="Αλλαγή προμηθευτή"
            aria-label="Αλλαγή προτεινόμενου προμηθευτή"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-300 dark:hover:bg-gray-900"
          >
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
        </div>

        {hasTemporaryChange ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-brand-100 pt-2 dark:border-brand-500/20">
            <span className="mr-auto text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Προσωρινή επιλογή
            </span>
            <button
              type="button"
              onClick={handleRevert}
              disabled={disabled || saving}
              className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold text-gray-500 transition hover:bg-white hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-200"
            >
              <X className="h-3 w-3" />
              Επαναφορά
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={disabled || saving || !suffix.trim()}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-brand-500 px-2 text-[10px] font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Αποθήκευση
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="3+ χαρακτήρες"
            autoComplete="off"
            aria-label="Αναζήτηση προμηθευτή"
            className="h-8 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-8 text-xs text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          {searching ? (
            <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-brand-500" />
          ) : null}

          {trimmedQuery.length >= 3 ? (
            <div className="absolute right-0 top-full z-30 mt-1 max-h-56 w-80 max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
              {searching || !hasSearched ? (
                <p className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
                  Αναζήτηση προμηθευτών...
                </p>
              ) : searchError ? (
                <p className="px-3 py-3 text-xs text-red-600 dark:text-red-400">
                  {searchError}
                </p>
              ) : results.length > 0 ? (
                results.map((supplier, index) => (
                  <button
                    key={`${supplier.TRDR}-${supplier.CODE}-${index}`}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className="block w-full border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-brand-50 focus:bg-brand-50 focus:outline-none dark:border-gray-800 dark:hover:bg-brand-500/10 dark:focus:bg-brand-500/10"
                  >
                    <span className="block truncate text-xs font-semibold text-gray-900 dark:text-white">
                      {supplier.NAME || "Χωρίς όνομα"}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">
                      Κωδικός: {supplier.CODE || "—"} · ΑΦΜ: {supplier.AFM || "—"} · TRDR: {supplier.TRDR || "—"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                  Δεν βρέθηκαν προμηθευτές.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {saveError ? (
        <p className="mt-1.5 text-[10px] leading-4 text-red-600 dark:text-red-400">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
