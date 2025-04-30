const categorias = ["Preliminares", "Administrativo", "ManoObra", "Materiales", "SST", "LogisticaTransporte", "HerramientasEquipos", "Viaticos"];

// Formateo de números y moneda
function formatNumber(number) {
    return isNaN(number) || number === null ? '0.00' : number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCurrency(number, moneda = 'COP') {
    const symbols = { 'COP': '$', 'USD': '$', 'EUR': '€' };
    const validNumber = isNaN(number) || number === null ? 0 : number;
    return `${symbols[moneda] || '$'} ${formatNumber(validNumber)} ${moneda}`;
}

// Notificaciones
function showToast(message, type = 'error') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: type === 'error' ? '#dc3545' : '#28a745',
    }).showToast();
}

// Modo oscuro
function toggleDarkMode() {
    try {
        const body = document.body;
        const isDark = body.classList.toggle('dark-theme');
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
        const toggleBtn = document.getElementById('darkModeToggle');
        toggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    } catch (error) {
        console.error('Error al alternar modo oscuro:', error);
        showToast('Error al alternar modo oscuro: ' + error.message);
    }
}

// Cambiar pestañas
function openTab(tabName) {
    try {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-nav a').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        const tabElement = document.getElementById(tabName);
        if (!tabElement) throw new Error(`Pestaña con ID '${tabName}' no encontrada.`);
        tabElement.classList.add('active');
        const navButton = document.querySelector(`.sidebar-nav a[data-tab="${tabName}"]`);
        if (navButton) {
            navButton.classList.add('active');
            navButton.setAttribute('aria-selected', 'true');
        }

        if (tabName === 'maestro-insumos') {
            cargarInsumos();
        } else if (tabName === 'calculadora') {
            calcularAPU();
        } else if (tabName === 'cotizacion') {
            setTimeout(() => {
                toggleAIUFields();
                calcularCotizacion();
                actualizarConsecutivo();
                actualizarTasaCambio();
                toggleTiempoImportacion();
                calcularFechaLlegadaMaterial();
                calcularFechaFinal();
            }, 200);
        } else if (tabName === 'consultar') {
            filtrarCotizaciones();
        }
    } catch (error) {
        console.error('Error al cambiar pestaña:', error);
        showToast('Error al cambiar de pestaña: ' + error.message);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Modo oscuro
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-theme');
            document.getElementById('darkModeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        }

        // Event listeners para pestañas
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();
                openTab(button.dataset.tab);
            });
        });

        // Botón modo oscuro
        document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

        // Inicializar pestaña activa
        openTab('calculadora');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showToast('Error al inicializar la aplicación: ' + error.message);
    }
});