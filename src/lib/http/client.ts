import axios from "axios";

export const httpClient = axios.create({
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

