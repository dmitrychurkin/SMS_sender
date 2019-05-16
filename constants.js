export const ENDPOINT = 'wss://sms-service-spdev.herokuapp.com';
export const JOB_KEY = 'KEEP_SOCKET_CONNECTED';
export const JOB_DEFAULT_PERIOD = 1000;
export const JOB_DEFAULT_SETTINGS = {
    jobKey: JOB_KEY,
    period: JOB_DEFAULT_PERIOD,
    persist: true,
    exact: true,
    allowWhileIdle: true,
    allowExecutionInForeground: false
};