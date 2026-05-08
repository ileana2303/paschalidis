import type { ReactNode } from "react";
import type { IBasket, ICustomerInfo } from "@/lib/interface";
import OrderSummary from "@/components/order-summary/customer-order-summary";
import EndoOrderSummary, { type EndoBasketUiItem } from "@/components/endo/endo-order-summary";

type ReceiptType = "receipt" | "invoice";

interface PartsSummarySidebarProps {
    customer: ICustomerInfo | null;
    isEndoMode: boolean;
    currentBranchCode: string;
    currentBranchName: string;
    endoBasketItems: EndoBasketUiItem[];
    endoSummaryLoading: boolean;
    endoBasketError: string;
    endoBasketSuccess: string;
    sidebarVisible: boolean;
    onToggleSidebar: () => void;
    basket: IBasket | null;
    basketLoading: boolean;
    basketError: string;
    basketSuccessMessage?: ReactNode;
    onRefreshBasket: () => void;
    selectedItems: Set<string>;
    selectedCount: number;
    selectedTotal: number;
    receiptType: ReceiptType;
    onReceiptTypeChange: (type: ReceiptType) => void;
    pickupPoint: string;
    onPickupPointChange: (value: string) => void;
    notes: string;
    onNotesChange: (value: string) => void;
    onSendOrder: () => void;
    sendingOrder: boolean;
    onToggleSelectedItem: (uid: string) => void;
    onRemoveItem: (uid: string) => void;
    removingBasketItems: Set<string>;
    onRemoveSelectedItems: () => void;
    removingSelectedBasketItems: boolean;
}

export default function PartsSummarySidebar({
    customer,
    isEndoMode,
    currentBranchCode,
    currentBranchName,
    endoBasketItems,
    endoSummaryLoading,
    endoBasketError,
    endoBasketSuccess,
    sidebarVisible,
    onToggleSidebar,
    basket,
    basketLoading,
    basketError,
    basketSuccessMessage,
    onRefreshBasket,
    selectedItems,
    selectedCount,
    selectedTotal,
    receiptType,
    onReceiptTypeChange,
    pickupPoint,
    onPickupPointChange,
    notes,
    onNotesChange,
    onSendOrder,
    sendingOrder,
    onToggleSelectedItem,
    onRemoveItem,
    removingBasketItems,
    onRemoveSelectedItems,
    removingSelectedBasketItems,
}: PartsSummarySidebarProps) {
    if (!customer) {
        return null;
    }

    if (isEndoMode) {
        return (
            <EndoOrderSummary
                currentBranchCode={currentBranchCode}
                currentBranchName={currentBranchName}
                basketItems={endoBasketItems}
                loading={endoSummaryLoading}
                error={endoBasketError}
                successMessage={endoBasketSuccess}
                collapsible
                collapsed={!sidebarVisible}
                onToggleCollapse={onToggleSidebar}
            />
        );
    }

    return (
        <OrderSummary
            customer={customer}
            basket={basket}
            loading={basketLoading}
            error={basketError}
            successMessage={basketSuccessMessage}
            onRefresh={onRefreshBasket}
            selectedItems={selectedItems}
            selectedCount={selectedCount}
            selectedTotal={selectedTotal}
            receiptType={receiptType}
            onReceiptTypeChange={onReceiptTypeChange}
            pickupPoint={pickupPoint}
            onPickupPointChange={onPickupPointChange}
            notes={notes}
            onNotesChange={onNotesChange}
            onSendOrder={onSendOrder}
            sendingOrder={sendingOrder}
            onToggleItem={onToggleSelectedItem}
            onRemoveItem={onRemoveItem}
            removingItems={removingBasketItems}
            onRemoveSelectedItems={onRemoveSelectedItems}
            removingSelectedItems={removingSelectedBasketItems}
            collapsible
            collapsed={!sidebarVisible}
            onToggleCollapse={onToggleSidebar}
        />
    );
}
