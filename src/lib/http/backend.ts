import axios from "axios";

export const backend = axios.create({
    baseURL:
        "http://nice-shaw.213-158-91-236.plesk.page.213-158-91-236.winzone336.grserver.gr",
    headers: {
        "Content-Type": "application/json",
    },
    validateStatus: () => true,
});

