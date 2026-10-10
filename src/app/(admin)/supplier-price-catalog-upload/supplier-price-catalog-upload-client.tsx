"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import Label from "@/components/template-components/form/Label";
import Input from "@/components/template-components/form/input/InputField";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import { FileSpreadsheet, Loader2, Upload } from "@/lib/icons/lucide";
import { useUploadSupplierPriceCatalogMutation } from "@/hooks/queries/useSupplierPriceCatalogMutations";
import { useWarnBeforeLeaveWhileBusy } from "@/hooks/useWarnBeforeLeaveWhileBusy";
import {
  getSupplierFromSheetName,
  inferSupplierFromSheetName,
} from "@/lib/supplier-price-catalog/infer-supplier";
import { SUPPLIER_PRICE_INVALID_HEADERS_MESSAGE } from "@/lib/supplier-price-catalog/constants";
import {
  parseSupplierPriceFile,
  SupplierPriceSheetHeaderError,
} from "@/lib/supplier-price-catalog/parse-workbook";
import type {
  SupplierPriceRow,
  SupplierPriceUploadProgress,
} from "@/lib/supplier-price-catalog/types";

const INITIAL_UPLOAD_PROGRESS: SupplierPriceUploadProgress = {
  percent: 0,
  label: "",
};

const ACCEPTED_EXTENSIONS = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-excel": [".xls"],
};

export default function SupplierPriceCatalogUploadClient() {
  const { mutateAsync: uploadCatalog, isPending } =
    useUploadSupplierPriceCatalogMutation();

  useWarnBeforeLeaveWhileBusy(isPending);

  const [descr, setDescr] = useState("");
  const [prefixes, setPrefixes] = useState("");
  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [rows, setRows] = useState<SupplierPriceRow[]>([]);
  const [headerError, setHeaderError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(
    INITIAL_UPLOAD_PROGRESS
  );
  const [parsing, setParsing] = useState(false);
  const selectedFileRef = useRef<File | null>(null);

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  const parseFile = useCallback(
    async (file: File, preferredSheet?: string) => {
      setParsing(true);

      try {
        setHeaderError("");
        const { importableSheetNames, parsedSheets } =
          await parseSupplierPriceFile(file, preferredSheet);

        setAvailableSheets(importableSheetNames);

        if (parsedSheets.length === 0) {
          setRows([]);
          if (!preferredSheet) {
            setSheetName("");
          }
          toast.error(
            "Δεν βρέθηκαν έγκυρες γραμμές τιμών στο επιλεγμένο φύλλο."
          );
          return;
        }

        const selectedSheet =
          parsedSheets.find((sheet) => sheet.sheetName === preferredSheet) ??
          parsedSheets[0];

        setSheetName(selectedSheet.sheetName);
        setRows(selectedSheet.rows);
        setFileName(file.name);
        setHeaderError("");

        const inferredSupplier = inferSupplierFromSheetName(
          selectedSheet.sheetName
        );
        if (!inferredSupplier) {
          toast.error(
            `Το φύλλο «${selectedSheet.sheetName}» δεν αντιστοιχεί σε γνωστό προμηθευτή (FEBI, PRICES, TRISCAN).`
          );
        }

        if (!descr.trim() && inferredSupplier) {
          setDescr(`Τιμοκατάλογος ${inferredSupplier} — ${file.name}`);
        }

        if (!preferredSheet) {
          toast.success(
            `Φορτώθηκαν ${selectedSheet.rows.length} γραμμές από το φύλλο «${selectedSheet.sheetName}».`
          );
        }
      } catch (error) {
        setRows([]);

        if (!preferredSheet) {
          setAvailableSheets([]);
          setSheetName("");
        }

        if (error instanceof SupplierPriceSheetHeaderError) {
          setHeaderError(SUPPLIER_PRICE_INVALID_HEADERS_MESSAGE);
          toast.error(SUPPLIER_PRICE_INVALID_HEADERS_MESSAGE);
          return;
        }

        setHeaderError("");
        toast.error(
          error instanceof Error
            ? error.message
            : "Αποτυχία ανάγνωσης του αρχείου Excel."
        );
      } finally {
        setParsing(false);
      }
    },
    [descr]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      selectedFileRef.current = file;
      void parseFile(file);
    },
    [parseFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_EXTENSIONS,
    multiple: false,
    disabled: parsing || isPending,
  });

  const handleSheetChange = (nextSheet: string) => {
    const file = selectedFileRef.current;
    if (!file) return;
    setSheetName(nextSheet);
    void parseFile(file, nextSheet);
  };

  const resetForm = useCallback(() => {
    selectedFileRef.current = null;
    setDescr("");
    setPrefixes("");
    setFileName("");
    setSheetName("");
    setAvailableSheets([]);
    setRows([]);
    setHeaderError("");
    setUploadProgress(INITIAL_UPLOAD_PROGRESS);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (rows.length === 0) {
      toast.error("Ανεβάστε πρώτα ένα αρχείο με γραμμές τιμών.");
      return;
    }

    if (!descr.trim()) {
      toast.error("Συμπληρώστε την περιγραφή.");
      return;
    }

    if (!sheetName.trim()) {
      toast.error("Επιλέξτε φύλλο Excel.");
      return;
    }

    let supplier;
    try {
      supplier = getSupplierFromSheetName(sheetName);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Μη έγκυρο φύλλο προμηθευτή."
      );
      return;
    }

    setUploadProgress({ percent: 0, label: "Έναρξη ανέβασματος..." });

    try {
      const response = await uploadCatalog({
        payload: {
          supplier,
          descr: descr.trim(),
          filePath: fileName || "price-catalog.xlsx",
          prefixes: prefixes.trim(),
          rows,
        },
        onProgress: setUploadProgress,
      });

      toast.success(
        response.message ??
          `Ολοκληρώθηκε (batch #${response.batchId ?? "—"}, ${response.rowsUploaded ?? rows.length} γραμμές).`
      );
      resetForm();
    } catch (error) {
      setUploadProgress(INITIAL_UPLOAD_PROGRESS);
      toast.error(
        error instanceof Error
          ? error.message
          : "Αποτυχία ανέβασματος τιμοκαταλόγου."
      );
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Ανέβασμα Τιμοκαταλόγου" />

      <DataTable className="mt-4">
        <form onSubmit={handleSubmit} className="space-y-6 p-5">
          <div
            {...getRootProps()}
            className={[
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
              isDragActive
                ? "border-brand-400 bg-brand-50/60 dark:border-brand-500 dark:bg-brand-500/10"
                : "border-gray-300 bg-gray-50/60 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900/40",
              parsing || isPending ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            <input {...getInputProps()} />
            {parsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            ) : (
              <FileSpreadsheet className="h-8 w-8 text-brand-500" />
            )}
            <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-100">
              {isDragActive
                ? "Αφήστε το αρχείο εδώ..."
                : "Σύρετε ή επιλέξτε αρχείο Excel (.xlsx, .xls)"}
            </p>
            {fileName ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {fileName}
                {sheetName ? ` · φύλλο: ${sheetName}` : ""}
              </p>
            ) : null}
          </div>

          {headerError ? (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {headerError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {availableSheets.length > 0 ? (
              <div>
                <Label>Φύλλο Excel</Label>
                <select
                  value={sheetName}
                  onChange={(event) => handleSheetChange(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  {availableSheets.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <Label>Περιγραφή</Label>
              <Input
                value={descr}
                onChange={(event) => setDescr(event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Prefixes</Label>
              <Input
                value={prefixes}
                onChange={(event) => setPrefixes(event.target.value)}
              />
            </div>
          </div>

          {previewRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-950">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-500">
                      CODE
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-500">
                      EAN
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-500">
                      PRICE
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {previewRows.map((row, index) => (
                    <tr key={`${row.code}-${row.ean}-${index}`}>
                      <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-100">
                        {row.code}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                        {row.ean || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                        {row.price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > previewRows.length ? (
                <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Εμφάνιση {previewRows.length} από {rows.length} γραμμές.
                </p>
              ) : null}
            </div>
          ) : null}

          {isPending ? (
            <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-4 dark:border-brand-500/30 dark:bg-brand-500/10">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {uploadProgress.label || "Ανέβασμα στο ERP..."}
                </span>
                <span className="shrink-0 font-semibold text-brand-700 dark:text-brand-300">
                  {uploadProgress.percent}%
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-gray-900/60"
                role="progressbar"
                aria-valuenow={uploadProgress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Πρόοδος ανέβασματος τιμοκαταλόγου"
              >
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                isPending ||
                parsing ||
                rows.length === 0 ||
                Boolean(headerError) ||
                !inferSupplierFromSheetName(sheetName)
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isPending ? "Ανέβασμα..." : "Ανέβασμα"}
            </button>
          </div>
        </form>
      </DataTable>
    </div>
  );
}
