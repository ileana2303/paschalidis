import type { Metadata } from "next";
import UsersClient from "./users-client";

const title = "Διαχείριση Χρηστών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function UsersPage() {
    return <UsersClient />;
}
