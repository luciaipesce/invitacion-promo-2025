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
    "assets/img/carrusel5.jpeg"
];

const CARRUSEL_INTERVAL = 3000; // 3 segundos

let indice = 0;
let mostrarPrimera = true;

const bg1 = document.getElementById("hero-bg-1");
const bg2 = document.getElementById("hero-bg-2");

// fondo inicial
bg1.style.backgroundImage = `url(${imagenesCarrusel[0]})`;
bg1.classList.add("visible");

function cambiarFondoSuave() {
    indice = (indice + 1) % imagenesCarrusel.length;

    const siguienteImagen = imagenesCarrusel[indice];

    if (mostrarPrimera) {
        // cargamos en bg2 y hacemos fade-in
        bg2.style.backgroundImage = `url(${siguienteImagen})`;
        bg2.classList.add("visible");
        bg1.classList.remove("visible");
    } else {
        // cargamos en bg1 y hacemos fade-in
        bg1.style.backgroundImage = `url(${siguienteImagen})`;
        bg1.classList.add("visible");
        bg2.classList.remove("visible");
    }

    mostrarPrimera = !mostrarPrimera;
}

setInterval(cambiarFondoSuave, CARRUSEL_INTERVAL);

// ====== PLAYLIST (por ahora con localStorage) ======
const form = document.getElementById("theme-form");
const message = document.getElementById("theme-message");
const list = document.getElementById("playlist-list");

// Cargamos lo que haya guardado en este dispositivo
let temas = JSON.parse(localStorage.getItem("temasPromo2025") || "[]");
renderPlaylist();

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const artista = document.getElementById("artista").value.trim();
    const cancion = document.getElementById("cancion").value.trim();

    if (!artista || !cancion) return;

    const nuevoTema = { artista, cancion };
    temas.push(nuevoTema);

    // Guardar en localStorage (después acá se puede reemplazar por una base de datos real)
    localStorage.setItem("temasPromo2025", JSON.stringify(temas));

    renderPlaylist();

    form.reset();
    message.textContent = "¡Tema enviado! Gracias 💃";
    setTimeout(() => (message.textContent = ""), 2500);
});

function renderPlaylist() {
    list.innerHTML = "";
    temas.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = `${t.cancion} – ${t.artista}`;
        list.appendChild(li);
    });
}

// ====== MAPA MESAS: resaltar al tocar ======
const mesas = document.querySelectorAll(".mesa");
mesas.forEach((mesa) => {
    mesa.addEventListener("click", () => {
        // desactivar anteriores
        mesas.forEach((m) => m.classList.remove("activa"));
        mesa.classList.add("activa");

        // quitar el efecto después de unos segundos en mobile si querés
        setTimeout(() => {
        mesa.classList.remove("activa");
        }, 3000);
    });
});
