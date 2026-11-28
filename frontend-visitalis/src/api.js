// En desarrollo apunta al puerto 3000; en producción usa el mismo dominio HTTPS
export const API_URL = import.meta.env.DEV
    ? `http://${window.location.hostname}:3000`
    : "";
