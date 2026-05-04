import SearchModal from "@/components/search/search-modal";
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
        <SearchModal
            isOpen={isOpen}
            onClose={onClose}
            inputRef={inputRef}
            searchValue={searchValue}
            onSearchValueChange={onSearchValueChange}
            onSearch={onSearch}
            loading={loading}
            title="Βρείτε το ανταλλακτικό που ψάχνετε"
            placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
            searchAriaLabel="Αναζήτηση από modal"
            modalClassName="max-w-[820px] m-4 p-6 sm:p-8"
        />
    );
}
