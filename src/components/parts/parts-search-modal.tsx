import { Search, X } from "@/app/lib/lucide";
import { Modal } from "@/components/ui/modal";
import type { RefObject } from "react";

interface PartsSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    onSearch: () => void;
    loading: boolean;
}

export default function PartsSearchModal({
    isOpen,
    onClose,
    inputRef,
    searchValue,
    onSearchValueChange,
    onSearch,
    loading,
}: PartsSearchModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-[820px] m-4 p-6 sm:p-8">
            <div className="pr-12">
                <h4 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                    Βρείτε το ανταλλακτικό που ψάχνετε
                </h4>

                <div className="mt-6 flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchValue}
                            onChange={(e) => onSearchValueChange(e.target.value)}
                            onFocus={() => {
                                if (searchValue) {
                                    onSearchValueChange("");
                                }
                            }}
                            onKeyDown={(e) => e.key === "Enter" && onSearch()}
                            placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                            className={`w-full rounded-full border bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-100 focus:outline-none focus:bg-brand-50 dark:bg-gray-900 dark:text-white ${searchValue.trim()
                                ? "border-1 border-brand-500"
                                : "border-gray-300"
                                }`}
                        />

                        {searchValue.trim() && (
                            <button
                                type="button"
                                onClick={() => onSearchValueChange("")}
                                aria-label="Καθαρισμός αναζήτησης"
                                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onSearch}
                        aria-label="Αναζήτηση από modal"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                    >
                        {loading ? (
                            <span
                                aria-hidden="true"
                                className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                            />
                        ) : (
                            <>
                                <Search className="h-5 w-5" />
                                <span className="hidden sm:inline">Αναζήτηση</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
