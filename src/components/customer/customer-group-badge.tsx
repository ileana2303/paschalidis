import { UsersRound } from "@/lib/icons/lucide";
import type { ICustomerInfo } from "@/lib/interface";
import GroupBadge from "@/components/ui/group-badge";

interface CustomerGroupBadgeProps {
    customer: Pick<ICustomerInfo, "TRDPGROUP" | "GROUP_CODE" | "GROUP_NAME">;
    className?: string;
}

/** Customer group (TRDPGROUP · GROUP_CODE - GROUP_NAME). */
export default function CustomerGroupBadge({ customer, className = "" }: CustomerGroupBadgeProps) {
    return (
        <GroupBadge
            id={customer.TRDPGROUP}
            code={customer.GROUP_CODE}
            name={customer.GROUP_NAME}
            icon={UsersRound}
            idLabel="TRDPGROUP"
            emptyLabel="Χωρίς ομάδα"
            tone="brand"
            className={className}
        />
    );
}
