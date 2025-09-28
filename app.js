/* =========================
   CONFIGURACIÓN
========================= */
// Reemplaza con tu propio token de acceso OAuth de Deezer
const ACCESS_TOKEN = "TU_TOKEN_AQUI"; // obténlo en https://developers.deezer.com/myapps
const API_BASE = "https://api.deezer.com";

// Elementos del DOM
const resultsContainer = document.querySelector("#results");
const favoritesContainer = document.querySelector("#favorites");
const playlistsContainer = document.querySelector("#playlists");
const statusMessage = document.querySelector("#statusMessage");
const searchBtn = document.querySelector("#searchBtn");
const searchInput = document.querySelector("#searchInput");

/* =========================
   FUNCIONES DE UTILIDAD
========================= */
function showStatus(msg, type = "success") {
  statusMessage.className = `alert alert-${type}`;
  statusMessage.textContent = msg;
  statusMessage.classList.remove("d-none");
  setTimeout(() => statusMessage.classList.add("d-none"), 3000);
}

/* =========================
   BUSCAR CANCIONES (GET)
========================= */
async function searchTracks() {
  const query = searchInput.value.trim();
  if (!query) return showStatus("Escribe algo para buscar.", "warning");

  try {
    const res = await fetch(`https://cors-anywhere.herokuapp.com/${API_BASE}/search?q=${encodeURIComponent(query)}`);
    // ⚠️ Deezer no admite CORS directo, por eso el proxy. En producción usar backend propio.
    const data = await res.json();

    if (!res.ok) throw new Error(data.error?.message || "Error de búsqueda");

    // Limpiar y pintar resultados
    resultsContainer.innerHTML = "";
    data.data.forEach(track => {
      const col = document.createElement("div");
      col.className = "col";
      col.innerHTML = `
        <div class="card-music h-100 text-center p-2">
          <img src="${track.album.cover_medium}" alt="${track.title}" class="mb-2 rounded">
          <h6 class="fw-bold">${track.title}</h6>
          <p class="small">${track.artist.name}</p>
          <button class="btn btn-primary btn-sm" onclick="addFavorite(${track.id})">❤️ Favorito</button>
        </div>`;
      resultsContainer.appendChild(col);
    });
  } catch (err) {
    showStatus("Error en búsqueda: " + err.message, "danger");
  }
}

/* =========================
   OBTENER FAVORITOS (GET)
========================= */
async function getFavorites() {
  try {
    const res = await fetch(`https://cors-anywhere.herokuapp.com/${API_BASE}/user/me/tracks?access_token=${ACCESS_TOKEN}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "No se pudieron cargar favoritos");

    favoritesContainer.innerHTML = "";
    data.data.forEach(track => {
      const col = document.createElement("div");
      col.className = "col";
      col.innerHTML = `
        <div class="card-music h-100 text-center p-2">
          <img src="${track.album.cover_medium}" class="mb-2 rounded">
          <h6 class="fw-bold">${track.title}</h6>
          <p class="small">${track.artist.name}</p>
          <button class="btn btn-danger btn-sm" onclick="removeFavorite(${track.id})">🗑 Quitar</button>
        </div>`;
      favoritesContainer.appendChild(col);
    });
  } catch (err) {
    showStatus("Error cargando favoritos: " + err.message, "danger");
  }
}

/* =========================
   AGREGAR FAVORITO (POST)
========================= */
async function addFavorite(trackId) {
  try {
    const res = await fetch(`https://cors-anywhere.herokuapp.com/${API_BASE}/user/me/tracks?access_token=${ACCESS_TOKEN}&track_id=${trackId}`, {
      method: "POST"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "No se pudo agregar");

    showStatus("Agregado a favoritos");
    getFavorites();
  } catch (err) {
    showStatus("Error al agregar: " + err.message, "danger");
  }
}

/* =========================
   ELIMINAR FAVORITO (DELETE)
========================= */
async function removeFavorite(trackId) {
  try {
    const res = await fetch(`https://cors-anywhere.herokuapp.com/${API_BASE}/user/me/tracks?access_token=${ACCESS_TOKEN}&track_id=${trackId}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "No se pudo eliminar");

    showStatus("Eliminado de favoritos");
    getFavorites();
  } catch (err) {
    showStatus("Error al eliminar: " + err.message, "danger");
  }
}

/* =========================
   INICIALIZAR
========================= */
searchBtn.addEventListener("click", searchTracks);

// Cargar favoritos iniciales
getFavorites();
