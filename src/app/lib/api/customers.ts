export async function searchCustomers(search: string) {
    const res = await fetch("/api/customers/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ search }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch customers");
    }

    return res.json();
}