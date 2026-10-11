const axios = require('axios');
const { config, getServerById } = require('../config');

/**
 * Execute recovery action against the simulator server.
 * Never throws: on error or unreachable server returns { success: false, message: ... }.
 *
 * @param {Object|string} serverOrId Server object or serverId string
 * @param {string} action Recovery action name
 * @returns {Promise<{ serverId: string, action: string, success: boolean, message: string }>}
 */
async function executeRecovery(serverOrId, action) {
  const server = typeof serverOrId === 'string' ? getServerById(serverOrId) : serverOrId;
  const serverId = server ? server.serverId : (typeof serverOrId === 'string' ? serverOrId : 'unknown');

  if (!server) {
    return {
      serverId,
      action,
      success: false,
      message: 'unknown serverId'
    };
  }

  const baseUrl = `http://${config.simHost}:${server.port}`;

  try {
    const response = await axios.post(
      `${baseUrl}/control/recover`,
      { action },
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return {
      serverId,
      action,
      success: Boolean(response.data?.success),
      message: response.data?.message || `Action ${action} executed successfully`
    };
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Simulator unreachable';

    return {
      serverId,
      action,
      success: false,
      message: `Simulator unreachable: ${errorMsg}`
    };
  }
}

module.exports = {
  executeRecovery
};

