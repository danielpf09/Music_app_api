// Configuración de la API de Spotify
const CLIENT_ID = 'TU_CLIENT_ID_AQUI'; // Obtener en https://developer.spotify.com/dashboard
const CLIENT_SECRET = 'TU_CLIENT_SECRET_AQUI';
const API_URL = 'https://api.spotify.com/v1';

let accessToken = '';
let favoritos = [];
let playlists = [];
let userId = '';

const spanError = document.getElementById('error');

// Función para obtener el token de acceso (OAuth 2.0 Client Credentials Flow)
async function obtenerToken() {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error('Error al obtener token de acceso');
        }

        const data = await response.json();
        accessToken = data.access_token;
        console.log('Token obtenido exitosamente');
    } catch (error) {
        console.error('Error:', error);
        spanError.textContent = 'Error al conectar con Spotify: ' + error.message;
        spanError.style.color = 'red';
    }
}

// GET: Buscar música (canciones, artistas o álbumes)
async function buscarMusica() {
    const query = document.getElementById('searchInput').value.trim();
    const tipo = document.getElementById('searchType').value;

    if (!query) {
        spanError.textContent = 'Por favor ingresa un término de búsqueda';
        spanError.style.color = 'red';
        return;
    }

    if (!accessToken) {
        await obtenerToken();
    }

    try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&type=${tipo}&limit=12`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 401) {
            // Token expirado, obtener uno nuevo
            await obtenerToken();
            return buscarMusica(); // Reintentar
        }

        if (!response.ok) {
            throw new Error(`Error en la búsqueda: ${response.status}`);
        }

        const data = await response.json();
        mostrarResultados(data, tipo);
        spanError.textContent = '';
    } catch (error) {
        console.error('Error:', error);
        spanError.textContent = 'Error al buscar: ' + error.message;
        spanError.style.color = 'red';
    }
}

// Mostrar resultados de la búsqueda
function mostrarResultados(data, tipo) {
    const container = document.getElementById('resultadosContainer');
    let items = [];

    if (tipo === 'track') {
        items = data.tracks.items;
    } else if (tipo === 'artist') {
        items = data.artists.items;
    } else if (tipo === 'album') {
        items = data.albums.items;
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otro término de búsqueda</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    items.forEach(item => {
        const article = document.createElement('article');
        article.className = 'card';

        let imagen, nombre, subtitulo;

        if (tipo === 'track') {
            imagen = item.album.images[0]?.url || 'https://via.placeholder.com/200';
            nombre = item.name;
            subtitulo = item.artists.map(a => a.name).join(', ');
        } else if (tipo === 'artist') {
            imagen = item.images[0]?.url || 'https://via.placeholder.com/200';
            nombre = item.name;
            subtitulo = `${item.followers.total.toLocaleString()} seguidores`;
        } else if (tipo === 'album') {
            imagen = item.images[0]?.url || 'https://via.placeholder.com/200';
            nombre = item.name;
            subtitulo = item.artists.map(a => a.name).join(', ');
        }

        article.innerHTML = `
            <img src="${imagen}" alt="${nombre}" class="card-image">
            <div class="card-title">${nombre}</div>
            <div class="card-subtitle">${subtitulo}</div>
            <div class="card-actions">
                <button class="btn-favorite ${esFavorito(item.id) ? 'active' : ''}" 
                        onclick="guardarFavorito('${item.id}', '${tipo}')" 
                        title="Agregar a favoritos">
                    ❤️
                </button>
                <button class="btn-playlist" 
                        onclick="abrirModalAgregar('${item.id}', '${tipo}')" 
                        title="Agregar a playlist">
                    ➕
                </button>
            </div>
        `;

        container.appendChild(article);
    });
}

// POST: Guardar canción en favoritos
async function guardarFavorito(id, tipo) {
    if (esFavorito(id)) {
        quitarFavorito(id);
        return;
    }

    if (!accessToken) {
        await obtenerToken();
    }

    try {
        // Obtener detalles del item
        const response = await fetch(`${API_URL}/${tipo}s/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener detalles');
        }

        const item = await response.json();

        // Guardar en favoritos locales
        const favorito = {
            id: item.id,
            name: item.name,
            artist: tipo === 'track' ? item.artists.map(a => a.name).join(', ') : 
                    tipo === 'artist' ? `${item.followers.total.toLocaleString()} seguidores` : 
                    item.artists.map(a => a.name).join(', '),
            image: tipo === 'track' ? item.album.images[0]?.url : item.images[0]?.url,
            tipo: tipo
        };

        favoritos.push(favorito);
        
        spanError.textContent = `✅ "${item.name}" agregado a favoritos`;
        spanError.style.color = '#1DB954';
        
        // Actualizar vista si estamos en la pestaña de resultados
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value) {
            buscarMusica();
        }

    } catch (error) {
        console.error('Error:', error);
        spanError.textContent = 'Error al guardar favorito: ' + error.message;
        spanError.style.color = 'red';
    }
}

// Verificar si un item está en favoritos
function esFavorito(id) {
    return favoritos.some(fav => fav.id === id);
}

// DELETE: Quitar canción de favoritos
function quitarFavorito(id) {
    const favorito = favoritos.find(fav => fav.id === id);
    
    if (!favorito) {
        spanError.textContent = 'Error: Favorito no encontrado';
        spanError.style.color = 'red';
        return;
    }

    favoritos = favoritos.filter(fav => fav.id !== id);
    
    spanError.textContent = `✅ "${favorito.name}" eliminado de favoritos`;
    spanError.style.color = '#1DB954';
    
    cargarFavoritos();
}

// Cargar y mostrar favoritos
function cargarFavoritos() {
    const container = document.getElementById('favoritosContainer');
    
    if (favoritos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❤️</div>
                <h3>No tienes favoritos</h3>
                <p>Agrega canciones, artistas o álbumes a tus favoritos</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    favoritos.forEach(fav => {
        const article = document.createElement('article');
        article.className = 'card';
        
        article.innerHTML = `
            <img src="${fav.image}" alt="${fav.name}" class="card-image">
            <div class="card-title">${fav.name}</div>
            <div class="card-subtitle">${fav.artist}</div>
            <div class="card-actions">
                <button class="btn-remove" onclick="quitarFavorito('${fav.id}')">
                    🗑️ Quitar
                </button>
            </div>
        `;
        
        container.appendChild(article);
    });
}

// POST: Crear nueva playlist
async function crearNuevaPlaylist() {
    document.getElementById('playlistModal').style.display = 'flex';
    document.getElementById('playlistNameInput').value = '';
}

function cerrarModal() {
    document.getElementById('playlistModal').style.display = 'none';
}

async function confirmarCrearPlaylist() {
    const nombre = document.getElementById('playlistNameInput').value.trim();
    
    if (!nombre) {
        spanError.textContent = 'Por favor ingresa un nombre para la playlist';
        spanError.style.color = 'red';
        return;
    }

    // Crear playlist local (en producción con autenticación OAuth completa, 
    // se haría POST a /v1/users/{user_id}/playlists)
    const nuevaPlaylist = {
        id: Date.now().toString(),
        nombre: nombre,
        canciones: [],
        descripcion: 'Creada en Spotify Music Explorer'
    };

    playlists.push(nuevaPlaylist);
    
    spanError.textContent = `✅ Playlist "${nombre}" creada exitosamente`;
    spanError.style.color = '#1DB954';
    
    cerrarModal();
    cargarPlaylists();
}

// Cargar y mostrar playlists
function cargarPlaylists() {
    const container = document.getElementById('playlistsContainer');
    
    if (playlists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎵</div>
                <h3>No tienes playlists</h3>
                <p>Crea tu primera playlist y comienza a agregar música</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    playlists.forEach(playlist => {
        const article = document.createElement('article');
        article.className = 'card';
        
        article.innerHTML = `
            <img src="https://via.placeholder.com/200/1DB954/ffffff?text=${encodeURIComponent(playlist.nombre)}" 
                 alt="${playlist.nombre}" 
                 class="card-image">
            <div class="card-title">${playlist.nombre}</div>
            <div class="card-subtitle">${playlist.canciones.length} canciones</div>
            <div class="card-actions">
                <button class="btn-remove" onclick="eliminarPlaylist('${playlist.id}')">
                    🗑️ Eliminar
                </button>
            </div>
        `;
        
        container.appendChild(article);
    });
}

// DELETE: Eliminar playlist
function eliminarPlaylist(id) {
    const playlist = playlists.find(p => p.id === id);
    
    if (!playlist) {
        spanError.textContent = 'Error: Playlist no encontrada';
        spanError.style.color = 'red';
        return;
    }

    if (!confirm(`¿Estás seguro de eliminar la playlist "${playlist.nombre}"?`)) {
        return;
    }

    playlists = playlists.filter(p => p.id !== id);
    
    spanError.textContent = `✅ Playlist "${playlist.nombre}" eliminada`;
    spanError.style.color = '#1DB954';
    
    cargarPlaylists();
}

// POST: Agregar canción a playlist
let cancionSeleccionada = null;
let tipoSeleccionado = null;

function abrirModalAgregar(id, tipo) {
    cancionSeleccionada = id;
    tipoSeleccionado = tipo;
    
    if (playlists.length === 0) {
        spanError.textContent = 'Primero debes crear una playlist';
        spanError.style.color = 'red';
        return;
    }

    const modal = document.getElementById('addToPlaylistModal');
    const selector = document.getElementById('playlistSelector');

    selector.innerHTML = '';
    playlists.forEach(playlist => {
        const button = document.createElement('button');
        button.className = 'btn-confirm';
        button.style.width = '100%';
        button.style.marginBottom = '10px';
        button.textContent = `${playlist.nombre} (${playlist.canciones.length} canciones)`;
        button.onclick = () => agregarAPlaylist(playlist.id);
        selector.appendChild(button);
    });

    modal.style.display = 'flex';
}

function cerrarModalAgregar() {
    document.getElementById('addToPlaylistModal').style.display = 'none';
    cancionSeleccionada = null;
    tipoSeleccionado = null;
}

async function agregarAPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
        spanError.textContent = 'Error: Playlist no encontrada';
        spanError.style.color = 'red';
        return;
    }

    if (!accessToken) {
        await obtenerToken();
    }

    try {
        // Obtener detalles del item
        const response = await fetch(`${API_URL}/${tipoSeleccionado}s/${cancionSeleccionada}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener detalles del item');
        }

        const item = await response.json();

        // Verificar si ya está en la playlist
        if (playlist.canciones.some(c => c.id === item.id)) {
            spanError.textContent = 'Este elemento ya está en la playlist';
            spanError.style.color = 'orange';
            cerrarModalAgregar();
            return;
        }

        // Agregar a la playlist
        const cancion = {
            id: item.id,
            name: item.name,
            artist: tipoSeleccionado === 'track' ? item.artists.map(a => a.name).join(', ') : 
                    tipoSeleccionado === 'artist' ? 'Artista' : 
                    item.artists.map(a => a.name).join(', '),
            image: tipoSeleccionado === 'track' ? item.album.images[0]?.url : item.images[0]?.url
        };

        playlist.canciones.push(cancion);
        
        spanError.textContent = `✅ "${item.name}" agregado a "${playlist.nombre}"`;
        spanError.style.color = '#1DB954';

        cerrarModalAgregar();
        cargarPlaylists();

    } catch (error) {
        console.error('Error:', error);
        spanError.textContent = 'Error al agregar a playlist: ' + error.message;
        spanError.style.color = 'red';
    }
}

// Cambiar entre pestañas
function cambiarTab(tab) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Actualizar secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(tab).classList.add('active');

    // Cargar contenido según la pestaña
    if (tab === 'favoritos') {
        cargarFavoritos();
    } else if (tab === 'playlists') {
        cargarPlaylists();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Obtener token al cargar la página
    obtenerToken();

    // Búsqueda con Enter
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarMusica();
        }
    });

    // Cerrar modales al hacer clic fuera
    window.onclick = (event) => {
        const modalPlaylist = document.getElementById('playlistModal');
        const modalAgregar = document.getElementById('addToPlaylistModal');
        
        if (event.target === modalPlaylist) {
            cerrarModal();
        }
        if (event.target === modalAgregar) {
            cerrarModalAgregar();
        }
    };
});