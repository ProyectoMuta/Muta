// API Configuration
// This file provides the API base URL for all API calls

// Try to read from window.ENV if available, otherwise use defaults
const API_CONFIG = {
    // API Base URL - update this to match your backend URL
    baseURL: window.ENV?.API_URL || 'http://localhost:10000/backend',

    // Mercado Pago Public Key
    mpPublicKey: window.ENV?.MP_PUBLIC_KEY || 'TEST-your_public_key_here',

    // Timeout for API requests (in milliseconds)
    timeout: 30000,

    // Helper function to get full API URL
    getFullURL: function(endpoint) {
        // Remove leading slash if present
        endpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

        // Remove /backend from endpoint if present (to avoid duplication)
        endpoint = endpoint.replace(/^backend\//, '');

        return `${this.baseURL}/${endpoint}`;
    },

    // Helper function for fetch with default options
    fetch: async function(endpoint, options = {}) {
        const url = this.getFullURL(endpoint);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include', // Important for session cookies
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Helper GET request
    get: async function(endpoint) {
        return this.fetch(endpoint, { method: 'GET' });
    },

    // Helper POST request
    post: async function(endpoint, data) {
        return this.fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Helper PUT request
    put: async function(endpoint, data) {
        return this.fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // Helper DELETE request
    delete: async function(endpoint) {
        return this.fetch(endpoint, { method: 'DELETE' });
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}

// Make available globally
window.API_CONFIG = API_CONFIG;

console.log('API Configuration loaded:', API_CONFIG.baseURL);
