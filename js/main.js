// ====== CUENTA REGRESIVA ======
const eventDate = new Date("2025-12-13T21:00:00"); // ajustá si cambia

function updateCountdown() {
    const now = new Date().getTime();
    const distance = eventDate.getTime() - now;

    if (distance <= 0) {
        document.getElementById("days").textContent = "00";
        document.getElementById("hours").textContent = "00";
        document.getElementById("minutes").textContent = "00";
        document.getElementById("seconds").textContent = "00";
        return;
    }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").textContent = String(days).padStart(2, "0");
    document.getElementById("hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
    document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ====== CARRUSEL DE FONDO CON CROSSFADE ======
const imagenesCarrusel = [
    "assets/img/carrusel1.jpeg",
    "assets/img/carrusel2.jpeg",
    "assets/img/carrusel3.jpeg",
    "assets/img/carrusel4.jpeg",
    "assets/img/carrusel5.jpeg",
];

const CARRUSEL_INTERVAL = 3000; // 3 segundos

let indice = 0;
let mostrarPrimera = true;

const bg1 = document.getElementById("hero-bg-1");
const bg2 = document.getElementById("hero-bg-2");

// fondo inicial
if (bg1) {
    bg1.style.backgroundImage = `url(${imagenesCarrusel[0]})`;
    bg1.classList.add("visible");
}

function cambiarFondoSuave() {
    indice = (indice + 1) % imagenesCarrusel.length;
    const siguienteImagen = imagenesCarrusel[indice];

    if (!bg1 || !bg2) return;

    if (mostrarPrimera) {
        bg2.style.backgroundImage = `url(${siguienteImagen})`;
        bg2.classList.add("visible");
        bg1.classList.remove("visible");
    } else {
        bg1.style.backgroundImage = `url(${siguienteImagen})`;
        bg1.classList.add("visible");
        bg2.classList.remove("visible");
    }

    mostrarPrimera = !mostrarPrimera;
}

setInterval(cambiarFondoSuave, CARRUSEL_INTERVAL);

// ====== TOAST (mensajito) ======
const message = document.getElementById("theme-message");
const toastText = document.querySelector(".toast-text");

function showToast(texto) {
    const overlay = document.getElementById("toast-overlay");
    if (!message || !overlay || !toastText) return;

    toastText.textContent = texto;

    message.classList.add("toast-visible");
    overlay.classList.add("visible");

    if (message._timeoutId) clearTimeout(message._timeoutId);

    message._timeoutId = setTimeout(() => {
        message.classList.remove("toast-visible");
        overlay.classList.remove("visible");

        setTimeout(() => {
        toastText.textContent = "";
        }, 300);
    }, 3000);
}

const toastCloseBtn = document.querySelector(".toast-close");
if (toastCloseBtn) {
    toastCloseBtn.addEventListener("click", () => {
        const overlay = document.getElementById("toast-overlay");
        if (!message || !overlay) return;

        message.classList.remove("toast-visible");
        overlay.classList.remove("visible");

        setTimeout(() => {
        if (toastText) toastText.textContent = "";
        }, 300);
    });
}

// ====== PLAYLIST (SQL Server vía API) ======
const form = document.getElementById("theme-form");
const list = document.getElementById("playlist-list");

const API_BASE = "https://promo2025-playlist-api-dyfadhg9fddfdsfc.brazilsouth-01.azurewebsites.net";
const API_TEMAS_URL = `${API_BASE}/api/temas`;

// Array en memoria con lo que venga de la base
let temas = [];

// Cargar temas desde el servidor al iniciar
async function cargarTemasDesdeServidor() {
    try {
        const res = await fetch(API_TEMAS_URL);
        console.log("Respuesta GET /api/temas:", res.status, res.statusText);

        if (!res.ok) {
        const text = await res.text();
        console.log("Error /api/temas -> cuerpo:", text);
        throw new Error("Error al cargar temas");
        }

        temas = await res.json();
        console.log("Temas recibidos:", temas);
        renderPlaylist();
    } catch (err) {
        console.error("Fallo al cargar temas:", err);
        showToast("No se pudo Cargar la Playlist 😔");
    }
}

function renderPlaylist() {
    if (!list) return;

    list.innerHTML = "";
    temas.forEach((t, index) => {
        const li = document.createElement("li");
        li.className = "playlist-row";
        li.innerHTML = `
        <span class="col-number">${index + 1}</span>
        <span class="col-track">${t.Cancion}</span>
        <span class="col-artist">${t.Artista}</span>
        `;
        list.appendChild(li);
    });
}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const artista = document.getElementById("artista").value.trim();
        const cancion = document.getElementById("cancion").value.trim();
        const trackId = document.getElementById("track-id").value || null;

        if (!artista || !cancion) return;

        // evitar duplicados por TrackId
        if (trackId && temas.some((t) => t.TrackId === trackId)) {
        showToast("Ese Tema ya fue Agregado por Otro Invitado 😉");
        return;
    }

    // evitar duplicado texto
    if (
        temas.some(
            (t) =>
            t.Cancion.toLowerCase() === cancion.toLowerCase() &&
            t.Artista.toLowerCase() === artista.toLowerCase()
        )
        ) {
        showToast("Ese Tema ya se encuentra en la Playlist 🎶");
        return;
    }

    try {
        const res = await fetch(API_TEMAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artista, cancion, trackId }),
        });

        console.log("Respuesta POST /api/temas:", res.status, res.statusText);

        if (!res.ok) {
            const text = await res.text();
            console.log("Error POST /api/temas -> cuerpo:", text);
            throw new Error("Error al guardar el tema");
        }

        const nuevoTema = await res.json();
        temas.push(nuevoTema);
        renderPlaylist();

        form.reset();
        const inputBuscador = document.getElementById("buscador");
        if (inputBuscador) inputBuscador.value = "";

        showToast("¡Tema Agregado! Gracias 💃");
        } catch (err) {
        console.error("Fallo al guardar tema:", err);
        showToast("Error al Guardar el Tema 😢");
        }
    });
}

// ====== EXPORTAR PLAYLIST A CSV (vía backend) ======
const btnExportar = document.getElementById("exportar-playlist");

if (btnExportar) {
    btnExportar.addEventListener("click", () => {
        if (!temas || !temas.length) {
        showToast("Todavía no hay temas en la playlist 🎵");
        return;
        }

        window.open(`${API_BASE}/api/temas/export`, "_blank");
    });
}

// ====== BÚSQUEDA EN SPOTIFY ======
const SPOTIFY_PROXY_URL = `${API_BASE}/api/search`;

const inputBuscador = document.getElementById("buscador");
const inputArtista = document.getElementById("artista");
const inputCancionOculto = document.getElementById("cancion");
const inputTrackId = document.getElementById("track-id");
const resultsBox = document.getElementById("spotify-results");

let searchTimeoutId = null;

if (inputBuscador) {
  // cuando el usuario escribe en el buscador visible
    inputBuscador.addEventListener("input", () => {
        const query = inputBuscador.value.trim();

        // limpiamos selección anterior
        if (inputTrackId) inputTrackId.value = "";
        if (inputArtista) inputArtista.value = "";
        if (inputCancionOculto) inputCancionOculto.value = "";

        if (searchTimeoutId) clearTimeout(searchTimeoutId);

        if (query.length < 3) {
        if (resultsBox) {
            resultsBox.style.display = "none";
            resultsBox.innerHTML = "";
        }
        return;
        }

        // pequeño debounce
        searchTimeoutId = setTimeout(() => {
        buscarEnSpotify(query);
        }, 400);
    });
}

async function buscarEnSpotify(query) {
    if (!resultsBox) return;

    try {
        const res = await fetch(
        `${SPOTIFY_PROXY_URL}?q=${encodeURIComponent(query)}`
        );
        console.log("Respuesta GET /api/search:", res.status, res.statusText);

        if (!res.ok) throw new Error("Error al Buscar en Spotify");
        const data = await res.json();

        const tracks = data || [];
        if (!tracks.length) {
        resultsBox.innerHTML =
            "<div class='spotify-result-item'>No se encontraron resultados</div>";
        resultsBox.style.display = "block";
        return;
        }

        resultsBox.innerHTML = "";
        tracks.forEach((t) => {
        const div = document.createElement("div");
        div.className = "spotify-result-item";
        div.innerHTML = `<strong>${t.name}</strong><br><span>${t.artist}</span>`;
        div.addEventListener("click", () => {
            if (inputCancionOculto) inputCancionOculto.value = t.name;
            if (inputArtista) inputArtista.value = t.artist;
            if (inputTrackId) inputTrackId.value = t.id;
            if (inputBuscador)
            inputBuscador.value = `${t.name} – ${t.artist}`;

            resultsBox.style.display = "none";
            resultsBox.innerHTML = "";
        });
        resultsBox.appendChild(div);
        });

        resultsBox.style.display = "block";
    } catch (err) {
        console.error("Fallo búsqueda Spotify:", err);
        resultsBox.innerHTML =
        "<div class='spotify-result-item'>Error al Buscar. Probá de Nuevo.</div>";
        resultsBox.style.display = "block";
    }
    }

    // cerrar lista si clickean fuera
    document.addEventListener("click", (e) => {
    if (!resultsBox || !inputBuscador) return;

    if (!resultsBox.contains(e.target) && e.target !== inputBuscador) {
        resultsBox.style.display = "none";
    }
});

// === Cargar playlist al abrir la página ===
cargarTemasDesdeServidor();

document.addEventListener('DOMContentLoaded', () => {
    const mesas = document.querySelectorAll('.mesa');

    mesas.forEach(mesa => {
        mesa.addEventListener('click', () => {
        // Alterna la clase de estado activo
        mesa.classList.toggle('mesa-activa');
        });
    });
});

