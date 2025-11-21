/**
 * Archivo: functions/index.js
 * Propósito: Función de backend para generar un URL temporal y seguro
 * para los documentos marcados como 'solo_lectura' (evitando la descarga directa).
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa el SDK de Admin (requerido para interactuar con Storage y Auth)
admin.initializeApp();

// NOTA IMPORTANTE: REEMPLAZA EL NOMBRE DEL BUCKET CON EL DE TU PROYECTO
// El nombre del bucket es tu projectId + '.appspot.com'
const bucketName = 'biblioteca-virtual-4309a.appspot.com'; // <--- ¡VERIFICA ESTO!
const bucket = admin.storage().bucket(bucketName);

/**
 * Función HTTP Callable (invocada desde el frontend) que genera un URL firmado (temporal).
 * Solo se ejecuta si el usuario está autenticado.
 */
exports.getSignedUrl = functions.https.onCall(async (data, context) => {
    
    // 1. VERIFICACIÓN DE AUTENTICACIÓN (Seguridad crítica)
    if (!context.auth) {
        // Devuelve error si el usuario no ha iniciado sesión con Firebase Auth
        throw new functions.https.HttpsError('unauthenticated', 'Se requiere iniciar sesión para ver el documento seguro.');
    }

    const { rutaStorage } = data; // La ruta del archivo enviada desde biblioteca.html
    
    if (!rutaStorage) {
        throw new functions.https.HttpsError('invalid-argument', 'La ruta del archivo de Storage es requerida.');
    }

    // 2. CONFIGURACIÓN DEL URL FIRMADO
    const options = {
        version: 'v4', // Versión 4 para URLs más seguras
        action: 'read',
        // El archivo SOLO será accesible por 5 minutos (300,000 milisegundos)
        expires: Date.now() + 5 * 60 * 1000, 
    };

    try {
        // 3. GENERAR EL URL TEMPORAL
        const [url] = await bucket.file(rutaStorage).getSignedUrl(options);

        // Devolver el URL temporal al frontend
        return { signedUrl: url };

    } catch (error) {
        console.error("Error al generar URL firmado:", error);
        throw new functions.https.HttpsError('internal', 'No se pudo generar el enlace seguro para el documento.');
    }
});