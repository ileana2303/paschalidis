"use client";

import type {
    ReactNode,
    RefObject,
    UIEventHandler,
} from "react";

interface SearchResultsScrollAreaProps {
    children: ReactNode;
    scrollRef: RefObject<HTMLDivElement | null>;
    onScroll?: UIEventHandler<HTMLDivElement>;
    overlay?: ReactNode;
    className?: string;
    scrollClassName?: string;
}

export default function SearchResultsScrollArea({
    children,
    scrollRef,
    onScroll,
    overlay,
    className = "",
    scrollClassName = "",
}: SearchResultsScrollAreaProps) {
    return (
        <div className={["relative flex min-h-0 flex-1 flex-col", className].join(" ")}>
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className={[
                    "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                    scrollClassName,
                ].join(" ")}
            >
                {children}
            </div>

            {overlay}
        </div>
    );
}
