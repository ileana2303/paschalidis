import type { Metadata } from "next";
import UsersClient from "../users/users-client";

const title = "Λίστα Χρηστών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function UsersListPage() {
    return <UsersClient />;
}
