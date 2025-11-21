/*// biblioteca.js

// 1. Imports necesarios
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

// 2. 🔑 Tu Configuración de Firebase (Asegúrate de que esta sea correcta)
const firebaseConfig = {
    apiKey: "AIzaSyC_HlJ-0lGFp5ixexVHCpmEMS_CGZL-s", //
    authDomain: "biblioteca-virtual-4309a.firebaseapp.com", //
    projectId: "biblioteca-virtual-4309a", //
    storageBucket: "biblioteca-virtual-4309a.firebasestorage.app", //
    messagingSenderId: "25638889336",
    appId: "1:25638889336:web:2c17cc9737033df546020d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Referencia a la Cloud Function desplegada
const getSignedUrl = httpsCallable(functions, 'getSignedUrl'); 


// =================================================================================
// CÓDIGO CLAVE: COMPROBACIÓN DE LOGIN Y LÓGICA DE VISUALIZACIÓN
// =================================================================================

// 3. 🛡️ Protección de la Página (Verifica login antes de hacer cualquier cosa)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si el usuario NO está logueado, lo enviamos al login
        alert("Debes iniciar sesión para acceder a la biblioteca.");
        window.location.href = 'login.html';
    } else {
        // Si está logueado, cargamos los documentos o el directorio
        inicializarPagina();
    }
});


// 4. Lógica de inicio (decide si mostrar directorio o documentos)
async function inicializarPagina() {
    const params = new URLSearchParams(window.location.search);
    const materiaFiltro = params.get('materia');

    if (materiaFiltro) {
        // Muestra documentos de una materia específica
        document.getElementById('directorio-materias').style.display = 'none';
        document.getElementById('lista-documentos').style.display = 'block';
        document.getElementById('titulo-materia').textContent = `Recursos en: ${materiaFiltro.toUpperCase().replace(/_/g, ' ')}`;
        await cargarDocumentos(materiaFiltro);
    } else {
        // Muestra el directorio de materias
        document.getElementById('directorio-materias').style.display = 'block';
        document.getElementById('lista-documentos').style.display = 'none';
        await cargarDirectorio();
    }
}

// 5. Función para cargar el listado de materias (usando los datos de Firestore)
async function cargarDirectorio() {
    const listaMateriasUL = document.getElementById('lista-materias-ul');
    listaMateriasUL.innerHTML = '<li>Cargando directorio...</li>';
    
    // Obtener todas las materias únicas de la colección 'documentos'
    const docsSnapshot = await getDocs(collection(db, "documentos"));
    const materiasSet = new Set();
    
    docsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.materia) {
            materiasSet.add(data.materia); // La materia se usa para el filtro
        }
    });

    listaMateriasUL.innerHTML = ''; // Limpiar
    
    if (materiasSet.size > 0) {
        materiasSet.forEach(materia => {
            const materiaURL = encodeURIComponent(materia);
            const materiaNombre = materia.replace(/_/g, ' '); // Formato para mostrar
            listaMateriasUL.innerHTML += `
                <li>
                    <a href="biblioteca.html?materia=${materiaURL}"> ${materiaNombre} </a>
                </li>
            `;
        });
    } else {
        listaMateriasUL.innerHTML = '<li>No hay materias disponibles en la base de datos.</li>';
    }
}


// 6. Función para cargar y mostrar los documentos de una materia
async function cargarDocumentos(materia) {
    const documentosGrid = document.getElementById('documentos-grid');
    documentosGrid.innerHTML = '<h4>Cargando documentos...</h4>';

    try {
        const documentosSnapshot = await getDocs(collection(db, "documentos"));
        let htmlContent = '';
        
        documentosSnapshot.forEach(doc => {
            const data = doc.data();
            // Filtrar por la materia que viene del URL
            if (data.materia && data.materia.toLowerCase() === materia.toLowerCase()) {
                
                // Botón dinámico basado en la propiedad 'solo_lectura'
                const botonTexto = data.solo_lectura ? 'Ver Online' : 'Descargar PDF/Audio';
                
                if (data.solo_lectura) {
                    // Si es SOLO LECTURA, llama a la función de JS para la URL segura
                    htmlContent += `
                        <div class="tarjeta-libro solo-lectura">
                            <div class="titulo">${data.titulo}</div>
                            <div class="autor">Autor: ${data.autor || 'Desconocido'}</div>
                            <div class="info">Tipo: ${data.tipo.toUpperCase()}</div>
                            <button class="btn-descargar btn-view-only" 
                                    data-ruta-storage="${data.ruta_storage}" 
                                    onclick="abrirVisorSeguro('${data.ruta_storage}')">
                                ${botonTexto}
                            </button>
                        </div>
                    `;
                } else {
                    // Si SÍ se puede descargar, usa la URL directa
                    htmlContent += `
                        <div class="tarjeta-libro">
                            <div class="titulo">${data.titulo}</div>
                            <div class="autor">Autor: ${data.autor || 'Desconocido'}</div>
                            <div class="info">Tipo: ${data.tipo.toUpperCase()}</div>
                            <a href="${data.url_descarga}" target="_blank" class="btn-descargar">${botonTexto}</a>
                        </div>
                    `;
                }
            }
        });
        
        documentosGrid.innerHTML = htmlContent || '<h4>No hay documentos disponibles para esta materia.</h4>';

    } catch (error) {
        console.error("Error al cargar documentos:", error);
        documentosGrid.innerHTML = '<h4>Error al cargar documentos desde la base de datos.</h4>';
    }
}


// 7. FUNCIÓN CLAVE: Llama a la Cloud Function para obtener el URL seguro
window.abrirVisorSeguro = async function(rutaStorage) {
    
    // Deshabilitar botón temporalmente para evitar clics múltiples
    const btn = document.querySelector(`[data-ruta-storage="${rutaStorage}"]`);
    if (btn) {
        btn.textContent = "Generando enlace...";
        btn.disabled = true;
    }
    
    try {
        // Llama a la Cloud Function que generará el URL seguro (ver functions/index.js)
        const result = await getSignedUrl({ rutaStorage: rutaStorage });
        const secureUrl = result.data.signedUrl;

        // Abrir el URL seguro en una nueva ventana/visor PDF (¡No se podrá descargar fácilmente!)
        window.open(secureUrl, '_blank');

    } catch (error) {
        // Manejar errores de autenticación o de función (ej: si la función falla)
        alert(`Error al obtener enlace seguro. Por favor, verifica el login. Error: ${error.message}`);
        console.error("Error al llamar a getSignedUrl:", error);
    } finally {
        if (btn) {
            btn.textContent = "Ver Online";
            btn.disabled = false;
        }
    }
}*/