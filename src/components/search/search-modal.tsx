import SearchBar from "@/components/search/search-bar";
import { Modal } from "@/components/ui/modal";
import type { ReactNode, RefObject } from "react";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    onSearch: () => void;
    loading: boolean;
    title: string;
    placeholder: string;
    modalClassName?: string;
    contentClassName?: string;
    searchAriaLabel: string;
    clearAriaLabel?: string;
    children?: ReactNode;
}

export default function SearchModal({
    isOpen,
    onClose,
    inputRef,
    searchValue,
    onSearchValueChange,
    onSearch,
    loading,
    title,
    placeholder,
    modalClassName,
    contentClassName = "pr-12",
    searchAriaLabel,
    clearAriaLabel = "Καθαρισμός αναζήτησης",
    children,
}: SearchModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} className={modalClassName}>
            <div className={contentClassName}>
                <h4 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                    {title}
                </h4>

                <SearchBar
                    value={searchValue}
                    placeholder={placeholder}
                    onChange={onSearchValueChange}
                    onSearch={onSearch}
                    onClear={() => onSearchValueChange("")}
                    loading={loading}
                    inputRef={inputRef}
                    containerClassName="mt-6"
                    searchAriaLabel={searchAriaLabel}
                    clearAriaLabel={clearAriaLabel}
                />

                {children}
            </div>
        </Modal>
    );
}
