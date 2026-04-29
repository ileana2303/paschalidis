import type { ICustomerInfo } from "@/app/lib/interface";
import CustomerResults from "@/components/customer/customer-results";
import SearchModal from "@/components/search/search-modal";
import type { RefObject } from "react";

interface CustomerSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    onSearch: () => void;
    loading: boolean;
    error: string;
    results: ICustomerInfo[];
    hasSearched: boolean;
    onSelectCustomer: (customer: ICustomerInfo) => void;
}

export default function CustomerSearchModal({
    isOpen,
    onClose,
    inputRef,
    searchValue,
    onSearchValueChange,
    onSearch,
    loading,
    error,
    results,
    hasSearched,
    onSelectCustomer,
}: CustomerSearchModalProps) {
    return (
        <SearchModal
            isOpen={isOpen}
            onClose={onClose}
            inputRef={inputRef}
            searchValue={searchValue}
            onSearchValueChange={onSearchValueChange}
            onSearch={onSearch}
            loading={loading}
            title="Βρείτε τον πελάτη στη λίστα των καταχωρημένων πελατών"
            placeholder="Όνομα, ΑΦΜ, email..."
            searchAriaLabel="Αναζήτηση πελάτη"
            modalClassName="max-w-[900px] m-4 p-6 sm:p-8"
            contentClassName="space-y-6 pr-12"
        >
            <div className="max-h-[60dvh] overflow-y-auto">
                <div className="space-y-3">
                    {error && (
                        <p className="text-sm text-red-500">
                            {error}
                        </p>
                    )}

                    {results.length > 0 && (
                        <p className="text-sm text-gray-500">
                            Βρέθηκαν {results.length} πελάτες
                        </p>
                    )}

                    <CustomerResults
                        customers={results}
                        onSelectCustomer={onSelectCustomer}
                    />

                    {hasSearched && !loading && results.length === 0 && !error && (
                        <p className="text-center text-sm text-gray-400">
                            Δεν βρέθηκαν πελάτες
                        </p>
                    )}
                </div>
            </div>
        </SearchModal>
    );
}
