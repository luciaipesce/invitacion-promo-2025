// server/server.js
// =======================
//  Config básica servidor
// =======================
const express = require("express");
const cors = require("cors");
const sql = require("mssql");
require("dotenv").config(); // lee el .env

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // para leer JSON del body

// =======================
//  Config SQL Server
// =======================
const dbConfig = {
    user: "playlist_user",
    password: "Playlist2025!", // la que creaste en SQL Server
    server: "KASTUX",          // mismo nombre que usás en SSMS
    database: "Promo2025",
    options: {
        encrypt: false,              // en local no hace falta
        trustServerCertificate: true
    }
};

// Pool reutilizable
const poolPromise = sql
    .connect(dbConfig)
    .then((pool) => {
        console.log("✅ Conectado a SQL Server");
        return pool;
    })
    .catch((err) => {
        console.error("❌ Error al conectar a SQL Server:", err);
    });

// =======================
//  Config Spotify
// =======================
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.error("❌ Falta SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en el .env");
}

// Cache simple del token
let cachedToken = null;
let tokenExpiresAt = 0; // timestamp en ms

async function getSpotifyToken() {
    const now = Date.now();

  // reutilizamos token si está vigente
    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken;
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`,
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        const text = await response.text();
        console.error("Error al pedir token a Spotify:", text);
        throw new Error("No se pudo obtener el token de Spotify");
    }

    const data = await response.json();

    cachedToken = data.access_token;
    // suele ser 3600s, le restamos un minuto
    tokenExpiresAt = now + (data.expires_in - 60) * 1000;

    return cachedToken;
}

// =======================
//  Endpoint /api/search
// =======================
app.get("/api/search", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "Falta el parámetro q" });
    }

    try {
        const token = await getSpotifyToken();

        const apiUrl =
        "https://api.spotify.com/v1/search?type=track&limit=10&q=" +
        encodeURIComponent(query);

        const response = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });

        if (!response.ok) {
        const text = await response.text();
        console.error("Error en la búsqueda de Spotify:", text);
        return res.status(500).json({ error: "Error al buscar en Spotify" });
        }

        const data = await response.json();
        const items = data.tracks?.items || [];

        const resultados = items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        album: track.album.name,
        preview_url: track.preview_url,
        uri: track.uri,
        }));

        res.json(resultados);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error interno en el servidor" });
    }
});

// =======================
//   ENDPOINTS PLAYLIST
// =======================

// GET /api/temas -> lista todos los temas
app.get("/api/temas", async (req, res) => {
    try {
        const pool = await poolPromise;
        if (!pool) {
        return res.status(500).json({ error: "No hay conexión a la base de datos" });
        }

        const result = await pool
        .request()
        .query(`
            SELECT Id, Cancion, Artista, TrackId, CreatedAt
            FROM TemasPlaylist
            ORDER BY Id ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error al obtener temas:", err);
        res.status(500).json({ error: "Error al obtener temas" });
    }
});

// POST /api/temas -> agrega un nuevo tema
app.post("/api/temas", async (req, res) => {
    try {
        const { artista, cancion, trackId } = req.body;

        if (!artista || !cancion) {
        return res.status(400).json({ error: "Faltan datos (artista o canción)" });
        }

        const pool = await poolPromise;
        if (!pool) {
        return res.status(500).json({ error: "No hay conexión a la base de datos" });
        }

        const result = await pool
        .request()
        .input("Cancion", sql.NVarChar(200), cancion)
        .input("Artista", sql.NVarChar(200), artista)
        .input("TrackId", sql.NVarChar(100), trackId || null)
        .query(`
            INSERT INTO TemasPlaylist (Cancion, Artista, TrackId)
            OUTPUT INSERTED.Id,
                INSERTED.Cancion,
                INSERTED.Artista,
                INSERTED.TrackId,
                INSERTED.CreatedAt
            VALUES (@Cancion, @Artista, @TrackId);
        `);

        const nuevo = result.recordset[0];
        res.status(201).json(nuevo);
    } catch (err) {
        console.error("Error al insertar tema:", err);
        res.status(500).json({ error: "Error al insertar tema" });
    }
});

// DELETE /api/temas/:id -> borrar un tema (por si lo necesitás)
app.delete("/api/temas/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Id inválido" });
        }

        const pool = await poolPromise;
        if (!pool) {
        return res.status(500).json({ error: "No hay conexión a la base de datos" });
        }

        await pool
        .request()
        .input("Id", sql.Int, id)
        .query("DELETE FROM TemasPlaylist WHERE Id = @Id");

        res.json({ ok: true });
    } catch (err) {
        console.error("Error al eliminar tema:", err);
        res.status(500).json({ error: "Error al eliminar tema" });
    }
});

// GET /api/temas/export -> CSV para Excel
app.get("/api/temas/export", async (req, res) => {
    try {
        const pool = await poolPromise;
        if (!pool) {
        return res.status(500).json({ error: "No hay conexión a la base de datos" });
        }

        const result = await pool
        .request()
        .query(`
            SELECT Cancion, Artista, TrackId, CreatedAt
            FROM TemasPlaylist
            ORDER BY Id ASC
        `);

    const filas = result.recordset;

    let csv = "N°;Canción;Artista;TrackId;FechaHora\r\n";

    filas.forEach((fila, index) => {
        const n = index + 1;
        const cancion = (fila.Cancion || "").replace(/;/g, ",");
        const artista = (fila.Artista || "").replace(/;/g, ",");
        const track = (fila.TrackId || "").replace(/;/g, ",");
        const fecha =
            fila.CreatedAt instanceof Date
            ? fila.CreatedAt.toISOString()
            : fila.CreatedAt;

        csv += `${n};${cancion};${artista};${track};${fecha}\r\n`;
        });

        res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
        );
        res.setHeader(
        "Content-Disposition",
        "attachment; filename=playlist_promo2025.csv"
        );

        res.send(csv);
    } catch (err) {
        console.error("Error al exportar playlist:", err);
        res.status(500).json({ error: "Error al exportar playlist" });
    }
});

// =======================
//  Iniciar servidor HTTP
// =======================
app.listen(PORT, () => {
    console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});
