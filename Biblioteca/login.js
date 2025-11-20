function handleCredentialResponse(response) {
    try {
        const responsePayload = decodeJwtResponse(response.credential);
        const nombre = responsePayload.name;
        const correo = responsePayload.email;

        console.log("Intentando entrar con: " + correo);

        // --- VALIDACIÓN DEL DOMINIO ---
        // Cambia "@unev.edu.hn" si necesitas probar con "@gmail.com" temporalmente
        if (correo.endsWith("@unev.edu.hn")) {
            
            // 1. MENSAJE DE ÉXITO (VERDE)
            mostrarMensaje("✅ ¡Bienvenido, " + nombre + "!<br>Redirigiendo al sistema...", "exito");

            // Ocultamos el botón de Google para que se vea más limpio
            document.getElementById("botonGoogle").style.display = "none";

            // 2. ESPERAMOS 2 SEGUNDOS Y REDIRIGIMOS
            setTimeout(function() {
                window.location.href = "biblioteca.html"; 
            }, 2000); 

        } else {
            // 3. MENSAJE DE ERROR (ROJO)
            mostrarMensaje("⛔ Acceso Denegado.<br>El correo " + correo + " no pertenece a la UNEV.", "error");
        }

    } catch (e) {
        console.error(e);
        mostrarMensaje("Ocurrió un error inesperado.", "error");
    }
}

// Función para controlar los colores y el texto del mensaje
function mostrarMensaje(texto, tipo) {
    const msgDiv = document.getElementById("mensajeResultado");
    
    // Limpiamos clases anteriores
    msgDiv.className = ""; 
    
    // Agregamos la clase correcta (rojo o verde)
    if (tipo === "exito") {
        msgDiv.classList.add("tipo-exito");
    } else {
        msgDiv.classList.add("tipo-error");
    }

    msgDiv.innerHTML = texto;
    msgDiv.style.display = "block";
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}