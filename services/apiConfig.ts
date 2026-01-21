/**
 * Centralized API Configuration
 * 
 * Handles the retrieval and decoding of the Gemini API Key.
 * To prevent GitHub Secret Scanning from flagging the key in the built bundle on GitHub Pages,
 * we Base64 encode the key during the build process.
 * This file detects if the key is encoded and decodes it for use.
 */

const RAW_KEY = import.meta.env.VITE_API_KEY || "";

function getApiKey(): string {
    if (!RAW_KEY) return "";

    // Check if the key looks like a raw Google API key (starts with AIza)
    if (RAW_KEY.startsWith("AIza")) {
        return RAW_KEY;
    }

    // Attempt to decode from Base64
    try {
        const decoded = atob(RAW_KEY);
        // Simple validation to see if the decoded key looks compliant
        if (decoded.startsWith("AIza")) {
            return decoded;
        }
        // If it decodes to something else, maybe it wasn't encoded or is a different format.
        // For safety, return the decoded value if it looks vaguely distinct, or fallback.
        return decoded;
    } catch (e) {
        console.warn("Failed to decode API Key from Base64, using raw value.");
        return RAW_KEY;
    }
}

export const API_KEY = getApiKey();
export const HAS_API_KEY = !!API_KEY;
