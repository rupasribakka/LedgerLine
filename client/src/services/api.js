/**
 * LedgerLine API Client Service
 * 
 * Centralized service for communicating with the backend.
 * Uses Vite proxy (/api) in development or configured VITE_API_URL.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Fetch health status of the LedgerLine backend server
 * @returns {Promise<{ ok: boolean, data?: object, error?: string, responseTime?: number }>}
 */
export async function checkBackendHealth() {
  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (!response.ok) {
      return {
        ok: false,
        error: `Server responded with HTTP ${response.status}`,
        responseTime,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      data,
      responseTime,
    };
  } catch (err) {
    const endTime = performance.now();
    return {
      ok: false,
      error: err.message || 'Cannot reach backend server. Ensure server is running on port 5000.',
      responseTime: Math.round(endTime - startTime),
    };
  }
}
