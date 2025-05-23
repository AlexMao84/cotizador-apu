// Definir todas las funciones globales como vacías al inicio para evitar errores de "no definida"
window.agregarItemCotizacion = function () { console.warn('agregarItemCotizacion se llamó antes de su inicialización completa.'); };
window.eliminarItemCotizacion = function () { console.warn('eliminarItemCotizacion se llamó antes de su inicialización completa.'); };
window.toggleAIU = function () { console.warn('toggleAIU se llamó antes de su inicialización completa.'); };
window.toggleAIUFields = function () { console.warn('toggleAIUFields se llamó antes de su inicialización completa.'); };
window.actualizarTasaCambio = function () { console.warn('actualizarTasaCambio se llamó antes de su inicialización completa.'); };
window.calcularCotizacion = function () { console.warn('calcularCotizacion se llamó antes de su inicialización completa.'); };
window.toggleTiempoImportacion = function () { console.warn('toggleTiempoImportacion se llamó antes de su inicialización completa.'); };
window.calcularFechaLlegadaMaterial = function () { console.warn('calcularFechaLlegadaMaterial se llamó antes de su inicialización completa.'); };
window.calcularFechaFinal = function () { console.warn('calcularFechaFinal se llamó antes de su inicialización completa.'); };
window.guardarCotizacion = function () { console.warn('guardarCotizacion se llamó antes de su inicialización completa.'); };
window.generarPDFCotizacion = function () { console.warn('generarPDFCotizacion se llamó antes de su inicialización completa.'); };

// Definir las constantes y funciones que no dependen del DOM fuera de DOMContentLoaded
const GITHUB_TOKEN = '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';
const REPO_OWNER = 'alexmao84';
const REPO_NAME = 'cotizador-apu';
const COTIZACIONES_JSON_PATH = 'cotizaciones.json';
const PDF_FOLDER = 'cotizaciones_pdf';

function formatCurrency(amount, currency = 'COP') {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function descargarPDFCotizacion(consecutivo, pdfContent) {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfContent}`;
    link.download = `cotizacion_${consecutivo}.pdf`;
    link.click();
}

async function fetchCotizacionesFromGitHub() {
    try {
        if (!REPO_OWNER || !REPO_NAME || !GITHUB_TOKEN) {
            throw new Error('Configuración no inicializada: REPO_OWNER, REPO_NAME o GITHUB_TOKEN no están definidos.');
        }
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${COTIZACIONES_JSON_PATH}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (response.status === 404) {
            return { content: btoa(JSON.stringify([])), sha: null };
        }
        if (response.status === 401) {
            showToast('Credenciales inválidas. Por favor, actualice el token de GitHub.', 'error');
            return { content: btoa(JSON.stringify([])), sha: null };
        }
        if (response.status === 403) {
            showToast('Límite de la API de GitHub alcanzado o acceso denegado al repositorio. Verifique los permisos del token.', 'error');
            return { content: btoa(JSON.stringify([])), sha: null };
        }
        if (!response.ok) {
            throw new Error(`Error al cargar cotizaciones desde GitHub: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        return { content: data.content, sha: data.sha };
    } catch (error) {
        console.error('Error al cargar cotizaciones desde GitHub:', error);
        showToast('Error al cargar cotizaciones desde GitHub: ' + error.message, 'warning');
        return { content: btoa(JSON.stringify([])), sha: null };
    }
}

async function saveFileToGitHub(path, content, message, sha = null) {
    try {
        if (!REPO_OWNER || !REPO_NAME || !GITHUB_TOKEN) {
            throw new Error('Configuración no inicializada: REPO_OWNER, REPO_NAME o GITHUB_TOKEN no están definidos.');
        }
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: message,
                content: content,
                sha: sha
            })
        });
        if (response.status === 401) {
            showToast('Credenciales inválidas al guardar en GitHub. Por favor, actualice el token.', 'error');
            throw new Error('Credenciales inválidas.');
        }
        if (response.status === 403) {
            showToast('Límite de la API de GitHub alcanzado o acceso denegado al repositorio. Verifique los permisos del token.', 'error');
            throw new Error('Acceso denegado o límite de API alcanzado.');
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Código ${response.status}: ${response.statusText} - ${errorData.message || 'Sin detalles'}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al guardar en GitHub:', error);
        showToast(`Error al guardar en GitHub: ${error.message}`, 'warning');
        throw error;
    }
}

function agregarItemCotizacion() {
    try {
        const tabla = document.getElementById('tablaItemsCotizacion');
        if (!tabla) {
            throw new Error('El elemento tablaItemsCotizacion no está presente en el DOM.');
        }
        const tbody = tabla.getElementsByTagName('tbody')[0];
        if (!tbody) {
            throw new Error('El elemento tbody dentro de tablaItemsCotizacion no está presente.');
        }
        const newRow = tbody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="Nuevo Ítem" required></td>
            <td><select class="editable unidad">
                <option value="UND">UND</option>
                <option value="M2">M2</option>
                <option value="ML">ML</option>
            </select></td>
            <td><input type="number" class="editable cantidad" value="1" min="0" step="0.01" required></td>
            <td><input type="number" class="editable precioUnitario" value="0" min="0" step="0.01" required></td>
            <td class="subtotal"></td>
            <td><button class="delete-btn" onclick="eliminarItemCotizacion(this)" title="Eliminar ítem"><i class="fas fa-trash"></i></button></td>
        `;
        inicializarListenersEditables();
        window.calcularCotizacion();
    } catch (error) {
        console.error('Error al agregar ítem de cotización:', error);
        showToast('Error al agregar ítem: ' + error.message, 'error');
    }
}

function eliminarItemCotizacion(button) {
    try {
        button.closest('tr').remove();
        window.calcularCotizacion();
    } catch (error) {
        console.error('Error al eliminar ítem de cotización:', error);
        showToast('Error al eliminar ítem: ' + error.message, 'error');
    }
}

function toggleAIU() {
    try {
        const conAIU = document.getElementById('conAIU').checked;
        document.getElementById('aiuDesglose').classList.toggle('hidden', !conAIU);
        document.getElementById('valorAdministrativoRow').classList.toggle('hidden', !conAIU);
        document.getElementById('valorImprevistosRow').classList.toggle('hidden', !conAIU);
        document.getElementById('valorUtilidadRow').classList.toggle('hidden', !conAIU);
        document.getElementById('valorAIURow').classList.toggle('hidden', !conAIU);
        window.calcularCotizacion();
    } catch (error) {
        console.error('Error al alternar AIU:', error);
        showToast('Error al alternar AIU: ' + error.message, 'error');
    }
}

function toggleAIUFields() {
    try {
        const moneda = document.getElementById('moneda').value;
        const conAIUField = document.getElementById('conAIUField');
        conAIUField.classList.toggle('hidden', moneda !== 'COP');
        if (moneda !== 'COP') {
            document.getElementById('conAIU').checked = false;
            toggleAIU();
        }
    } catch (error) {
        console.error('Error al alternar campos AIU:', error);
        showToast('Error al alternar campos AIU: ' + error.message, 'error');
    }
}

function actualizarTasaCambio() {
    try {
        const moneda = document.getElementById('moneda').value;
        const tasaCambioInput = document.getElementById('tasaCambio');
        tasaCambioInput.disabled = moneda === 'COP';
        tasaCambioInput.value = moneda === 'COP' ? 1 : tasaCambioInput.value || 4000;
        window.calcularCotizacion();
    } catch (error) {
        console.error('Error al actualizar tasa de cambio:', error);
        showToast('Error al actualizar tasa de cambio: ' + error.message, 'error');
    }
}

function calcularCotizacion() {
    try {
        const tabla = document.getElementById('tablaItemsCotizacion');
        if (!tabla) {
            throw new Error('El elemento tablaItemsCotizacion no está presente en el DOM.');
        }
        const filas = tabla.getElementsByTagName('tbody')[0].rows;
        let subtotalGeneral = 0;
        let cantidadValida = true;

        for (let fila of filas) {
            const cantidad = parseFloat(fila.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(fila.querySelector('.precioUnitario').value) || 0;
            if (cantidad <= 0) {
                document.getElementById('cantidadError').classList.add('active');
                document.getElementById('cantidadError').textContent = 'La cantidad debe ser mayor a 0.';
                cantidadValida = false;
                continue;
            }
            const subtotal = cantidad * precio;
            fila.querySelector('.subtotal').textContent = formatCurrency(subtotal);
            subtotalGeneral += subtotal;
        }

        if (cantidadValida) {
            document.getElementById('cantidadError').classList.remove('active');
        }

        const conAIU = document.getElementById('conAIU').checked;
        let administracion = 0, imprevistos = 0, utilidad = 0, totalAIU = 0;
        if (conAIU) {
            administracion = (parseFloat(document.getElementById('administrativo').value) || 0) / 100 * subtotalGeneral;
            imprevistos = (parseFloat(document.getElementById('imprevistos').value) || 0) / 100 * subtotalGeneral;
            utilidad = (parseFloat(document.getElementById('utilidad').value) || 0) / 100 * subtotalGeneral;
            totalAIU = administracion + imprevistos + utilidad;
        }

        const iva = subtotalGeneral * 0.19;
        const total = subtotalGeneral + totalAIU + iva;
        const tasaCambio = parseFloat(document.getElementById('tasaCambio').value) || 1;
        if (tasaCambio <= 0) {
            document.getElementById('tasaCambioError').classList.add('active');
        } else {
            document.getElementById('tasaCambioError').classList.remove('active');
        }

        const moneda = document.getElementById('moneda').value;
        document.getElementById('precioUnitarioCantidad').textContent = formatCurrency(subtotalGeneral, moneda);
        document.getElementById('valorAdministrativo').textContent = formatCurrency(administracion, moneda);
        document.getElementById('valorImprevistos').textContent = formatCurrency(imprevistos, moneda);
        document.getElementById('valorUtilidad').textContent = formatCurrency(utilidad, moneda);
        document.getElementById('valorAIU').textContent = formatCurrency(totalAIU, moneda);
        document.getElementById('iva').textContent = formatCurrency(iva, moneda);
        document.getElementById('precioTotal').textContent = formatCurrency(total, moneda);

        const porcentajeAnticipo = parseFloat(document.getElementById('porcentajeAnticipo').value) || 0;
        const valorAnticipo = total * (porcentajeAnticipo / 100);
        document.getElementById('valorAnticipo').textContent = formatCurrency(valorAnticipo, moneda);

        window.calcularFechaLlegadaMaterial();
        window.calcularFechaFinal();
    } catch (error) {
        console.error('Error al calcular cotización:', error);
        showToast('Error al calcular cotización: ' + error.message, 'error');
        window.calcularFechaLlegadaMaterial();
        window.calcularFechaFinal();
    }
}

function toggleTiempoImportacion() {
    try {
        const importacion = document.getElementById('importacion').value;
        document.getElementById('tiempoImportacionField').classList.toggle('hidden', importacion === 'No');
        window.calcularFechaLlegadaMaterial();
    } catch (error) {
        console.error('Error al alternar tiempo de importación:', error);
        showToast('Error al alternar tiempo de importación: ' + error.message, 'error');
    }
}

function calcularFechaLlegadaMaterial() {
    try {
        const fechaAnticipo = document.getElementById('fechaAnticipo').value;
        const fechaLlegadaInput = document.getElementById('fechaLlegadaMaterial');
        if (!fechaAnticipo) {
            fechaLlegadaInput.value = '';
            showToast('Por favor, ingrese la fecha de anticipo para calcular las fechas.', 'warning');
            window.calcularFechaFinal();
            return;
        }
        const importacion = document.getElementById('importacion').value;
        let dias = 0;
        if (importacion === 'Sí') {
            dias = parseInt(document.getElementById('tiempoImportacion').value) || 0;
        }
        const fecha = new Date(fechaAnticipo);
        if (isNaN(fecha.getTime())) {
            showToast('La fecha de anticipo no es válida.', 'error');
            fechaLlegadaInput.value = '';
            window.calcularFechaFinal();
            return;
        }
        fecha.setDate(fecha.getDate() + dias);
        fechaLlegadaInput.value = fecha.toISOString().split('T')[0];
        window.calcularFechaFinal();
    } catch (error) {
        console.error('Error al calcular fecha de llegada:', error);
        showToast('Error al calcular fecha de llegada: ' + error.message, 'error');
    }
}

function calcularFechaFinal() {
    try {
        const fechaLlegada = document.getElementById('fechaLlegadaMaterial').value;
        const fechaFinalInput = document.getElementById('fechaFinal');
        if (!fechaLlegada) {
            fechaFinalInput.value = '';
            return;
        }
        const planeacion = (parseFloat(document.getElementById('tiempoPlaneacion').value) || 0) * 7;
        const fabricacion = (parseFloat(document.getElementById('tiempoFabricacionDespacho').value) || 0) * 7;
        const instalacion = (parseFloat(document.getElementById('tiempoInstalacion').value) || 0) * 30;
        const fecha = new Date(fechaLlegada);
        if (isNaN(fecha.getTime())) {
            showToast('La fecha de llegada del material no es válida.', 'error');
            fechaFinalInput.value = '';
            return;
        }
        fecha.setDate(fecha.getDate() + planeacion + fabricacion + instalacion);
        fechaFinalInput.value = fecha.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error al calcular fecha final:', error);
        showToast('Error al calcular fecha final: ' + error.message, 'error');
    }
}

async function actualizarConsecutivo() {
    try {
        let ultimoConsecutivoLocal = parseInt(localStorage.getItem('ultimoConsecutivo')) || 25040000;
        let nuevoConsecutivo = ultimoConsecutivoLocal;

        const { content } = await fetchCotizacionesFromGitHub();
        let cotizaciones = [];

        if (content && typeof content === 'string' && content.trim().length > 0) {
            try {
                cotizaciones = JSON.parse(atob(content));
                if (!Array.isArray(cotizaciones)) {
                    cotizaciones = [];
                }
            } catch (decodeError) {
                console.warn('Error al decodificar base64, inicializando cotizaciones vacías:', decodeError);
                cotizaciones = [];
            }
        }

        let ultimoConsecutivoGitHub = 25040000;
        if (cotizaciones.length > 0) {
            ultimoConsecutivoGitHub = cotizaciones
                .filter(cot => cot && cot.consecutivo && typeof cot.consecutivo === 'string' && cot.consecutivo.startsWith('SEL'))
                .reduce((max, cot) => {
                    const num = parseInt(cot.consecutivo.replace('SEL', '')) || 0;
                    return Math.max(max, num);
                }, 25040000);
        }

        nuevoConsecutivo = Math.max(ultimoConsecutivoGitHub, ultimoConsecutivoLocal) + 1;
        const nuevoConsecutivoStr = `SEL${nuevoConsecutivo}`;

        const consecutivoElement = document.getElementById('consecutivo');
        if (consecutivoElement) {
            consecutivoElement.textContent = nuevoConsecutivoStr;
        } else {
            console.error('Elemento con ID "consecutivo" no encontrado en el DOM.');
            showToast('Error: No se encontró el elemento para mostrar el consecutivo.', 'error');
        }

        localStorage.setItem('ultimoConsecutivo', nuevoConsecutivo.toString());
        return nuevoConsecutivoStr;
    } catch (error) {
        console.error('Error al actualizar consecutivo:', error);
        showToast('Error al actualizar consecutivo: ' + error.message, 'error');
        let ultimoConsecutivo = parseInt(localStorage.getItem('ultimoConsecutivo')) || 25040000;
        ultimoConsecutivo++;
        const fallbackConsecutivo = `SEL${ultimoConsecutivo}`;
        localStorage.setItem('ultimoConsecutivo', ultimoConsecutivo.toString());

        const consecutivoElement = document.getElementById('consecutivo');
        if (consecutivoElement) {
            consecutivoElement.textContent = fallbackConsecutivo;
        }
        return fallbackConsecutivo;
    }
}

async function buscarCotizacionPorConsecutivo(consecutivo) {
    try {
        // Primero, buscar en localStorage
        let localCotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        let cotizacion = localCotizaciones.find(cot => cot.consecutivo === consecutivo);
        if (cotizacion) {
            return cotizacion;
        }

        // Si no se encuentra en localStorage, buscar en GitHub
        const { content } = await fetchCotizacionesFromGitHub();
        let cotizaciones = [];
        if (content && typeof content === 'string' && content.trim().length > 0) {
            cotizaciones = JSON.parse(atob(content));
            if (!Array.isArray(cotizaciones)) {
                cotizaciones = [];
            }
        }
        cotizacion = cotizaciones.find(cot => cot.consecutivo === consecutivo);
        if (!cotizacion) {
            throw new Error('Cotización no encontrada.');
        }
        return cotizacion;
    } catch (error) {
        console.error('Error al buscar cotización:', error);
        throw new Error('Cotización no encontrada: ' + error.message);
    }
}

async function generarPDFCotizacion(consecutivo) {
    try {
        const cotizacion = await buscarCotizacionPorConsecutivo(consecutivo);
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            throw new Error('jsPDF no está disponible. Asegúrese de incluir la librería.');
        }
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const marginLeft = 10;
        const marginTop = 10;
        let yPos = marginTop;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Cotización', 105, yPos, { align: 'center' });
        yPos += 10;
        doc.setFontSize(12);
        doc.text(`No. ${cotizacion.consecutivo}`, 105, yPos, { align: 'center' });
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${cotizacion.fechaCreacion}`, 190, yPos, { align: 'right' });
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Información General', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Cliente: ${cotizacion.nombreCliente}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Proyecto: ${cotizacion.proyecto}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Descripción: ${cotizacion.descripcion || 'Sin descripción'}`, marginLeft, yPos);
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Ítems de la Cotización', marginLeft, yPos);
        yPos += 5;
        const itemData = cotizacion.items.map((item, index) => [
            (index + 1).toString(),
            item.descripcion,
            item.unidad,
            item.cantidad.toFixed(2),
            formatCurrency(item.precioUnitario, cotizacion.moneda),
            formatCurrency(item.subtotal, cotizacion.moneda)
        ]);
        doc.autoTable({
            startY: yPos,
            head: [['#', 'Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: itemData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [50, 50, 50] },
            margin: { left: marginLeft, right: marginLeft }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen de Costos', marginLeft, yPos);
        yPos += 5;
        let subtotalGeneral = cotizacion.items.reduce((sum, item) => sum + item.subtotal, 0);
        let administracion = 0, imprevistos = 0, utilidad = 0, totalAIU = 0;
        if (cotizacion.conAIU) {
            administracion = (cotizacion.administrativo / 100) * subtotalGeneral;
            imprevistos = (cotizacion.imprevistos / 100) * subtotalGeneral;
            utilidad = (cotizacion.utilidad / 100) * subtotalGeneral;
            totalAIU = administracion + imprevistos + utilidad;
        }
        const iva = subtotalGeneral * 0.19;
        const total = subtotalGeneral + totalAIU + iva;
        const valorAnticipo = total * (cotizacion.porcentajeAnticipo / 100);
        const costData = [
            ['Subtotal', formatCurrency(subtotalGeneral, cotizacion.moneda)]
        ];
        if (cotizacion.conAIU) {
            costData.push(['Administración', formatCurrency(administracion, cotizacion.moneda)]);
            costData.push(['Imprevistos', formatCurrency(imprevistos, cotizacion.moneda)]);
            costData.push(['Utilidad', formatCurrency(utilidad, cotizacion.moneda)]);
            costData.push(['Total AIU', formatCurrency(totalAIU, cotizacion.moneda)]);
        }
        costData.push(['IVA (19%)', formatCurrency(iva, cotizacion.moneda)]);
        costData.push(['Total', formatCurrency(total, cotizacion.moneda)]);
        costData.push(['Anticipo', formatCurrency(valorAnticipo, cotizacion.moneda)]);
        doc.autoTable({
            startY: yPos,
            body: costData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: marginLeft, right: marginLeft }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Condiciones', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Forma de Pago: ${cotizacion.formaPago}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Porcentaje de Anticipo: ${cotizacion.porcentajeAnticipo}%`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Fecha de Anticipo: ${cotizacion.fechaAnticipo}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Importación: ${cotizacion.importacion}`, marginLeft, yPos);
        if (cotizacion.importacion === 'Sí') {
            yPos += 5;
            doc.text(`Tiempo de Importación: ${cotizacion.tiempoImportacion} días`, marginLeft, yPos);
        }
        yPos += 5;
        doc.text(`Fecha de Llegada Material: ${cotizacion.fechaLlegadaMaterial}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Tiempo de Planeación: ${cotizacion.tiempoPlaneacion} semanas`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Tiempo de Fabricación y Despacho: ${cotizacion.tiempoFabricacionDespacho} semanas`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Tiempo de Instalación: ${cotizacion.tiempoInstalacion} meses`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Fecha Final: ${cotizacion.fechaFinal}`, marginLeft, yPos);

        const pdfBase64 = doc.output('datauristring').split(',')[1];
        descargarPDFCotizacion(consecutivo, pdfBase64);
    } catch (error) {
        console.error('Error al generar PDF:', error);
        showToast('Error al generar PDF: ' + error.message, 'error');
    }
}

async function guardarCotizacion() {
    try {
        window.calcularCotizacion(); // Asegurar que los valores estén actualizados
        const consecutivo = document.getElementById('consecutivo').textContent;
        const nombreCliente = document.getElementById('nombreCliente').value || 'Cliente Desconocido';
        const proyecto = document.getElementById('proyecto').value || 'Proyecto Sin Nombre';
        const descripcion = document.getElementById('descripcion').value || '';
        const moneda = document.getElementById('moneda').value;
        const tasaCambio = parseFloat(document.getElementById('tasaCambio').value) || 1;
        const conAIU = document.getElementById('conAIU').checked;
        const administrativo = parseFloat(document.getElementById('administrativo').value) || 0;
        const imprevistos = parseFloat(document.getElementById('imprevistos').value) || 0;
        const utilidad = parseFloat(document.getElementById('utilidad').value) || 0;
        const formaPago = document.getElementById('formaPago').value;
        const porcentajeAnticipo = parseFloat(document.getElementById('porcentajeAnticipo').value) || 0;
        const fechaAnticipo = document.getElementById('fechaAnticipo').value || '';
        const importacion = document.getElementById('importacion').value;
        const tiempoImportacion = parseInt(document.getElementById('tiempoImportacion').value) || 0;
        const fechaLlegadaMaterial = document.getElementById('fechaLlegadaMaterial').value || '';
        const tiempoPlaneacion = parseFloat(document.getElementById('tiempoPlaneacion').value) || 0;
        const tiempoFabricacionDespacho = parseFloat(document.getElementById('tiempoFabricacionDespacho').value) || 0;
        const tiempoInstalacion = parseFloat(document.getElementById('tiempoInstalacion').value) || 0;
        const fechaFinal = document.getElementById('fechaFinal').value || '';

        const tabla = document.getElementById('tablaItemsCotizacion').getElementsByTagName('tbody')[0];
        const items = Array.from(tabla.rows).map(row => {
            const descripcion = row.querySelector('.descripcion').value || 'Ítem Sin Descripción';
            const unidad = row.querySelector('.unidad').value;
            const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
            const precioUnitario = parseFloat(row.querySelector('.precioUnitario').value) || 0;
            const subtotal = cantidad * precioUnitario;

            if (isNaN(cantidad) || isNaN(precioUnitario) || isNaN(subtotal)) {
                throw new Error('Valores inválidos en los ítems de la cotización.');
            }

            return {
                "descripcion": descripcion,
                "unidad": unidad,
                "cantidad": cantidad,
                "precioUnitario": precioUnitario,
                "subtotal": subtotal
            };
        });

        if (!items.length || !nombreCliente || !proyecto) {
            showToast('Complete los campos requeridos: Cliente, Proyecto e Ítems.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            throw new Error('jsPDF no está disponible. Asegúrese de incluir la librería.');
        }
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const marginLeft = 10;
        const marginTop = 10;
        let yPos = marginTop;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Cotización', 105, yPos, { align: 'center' });
        yPos += 10;
        doc.setFontSize(12);
        doc.text(`No. ${consecutivo}`, 105, yPos, { align: 'center' });
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const today = new Date().toISOString().split('T')[0];
        doc.text(`Fecha: ${today}`, 190, yPos, { align: 'right' });
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Información General', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Cliente: ${nombreCliente}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Proyecto: ${proyecto}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Descripción: ${descripcion || 'Sin descripción'}`, marginLeft, yPos);
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Ítems de la Cotización', marginLeft, yPos);
        yPos += 5;
        const itemData = items.map((item, index) => [
            (index + 1).toString(),
            item.descripcion,
            item.unidad,
            item.cantidad.toFixed(2),
            formatCurrency(item.precioUnitario, moneda),
            formatCurrency(item.subtotal, moneda)
        ]);
        doc.autoTable({
            startY: yPos,
            head: [['#', 'Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: itemData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [50, 50, 50] },
            margin: { left: marginLeft, right: marginLeft }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen de Costos', marginLeft, yPos);
        yPos += 5;
        const subtotalGeneral = parseFloat(document.getElementById('precioUnitarioCantidad').textContent.replace(/[^0-9.]/g, '')) || 0;
        let administracion = 0, imprevistos = 0, utilidad = 0, totalAIU = 0;
        if (conAIU) {
            administracion = (administrativo / 100) * subtotalGeneral;
            imprevistos = (imprevistos / 100) * subtotalGeneral;
            utilidad = (utilidad / 100) * subtotalGeneral;
            totalAIU = administracion + imprevistos + utilidad;
        }
        const iva = subtotalGeneral * 0.19;
        const total = subtotalGeneral + totalAIU + iva;
        const valorAnticipo = total * (porcentajeAnticipo / 100);
        const costData = [
            ['Subtotal', formatCurrency(subtotalGeneral, moneda)]
        ];
        if (conAIU) {
            costData.push(['Administración', formatCurrency(administracion, moneda)]);
            costData.push(['Imprevistos', formatCurrency(imprevistos, moneda)]);
            costData.push(['Utilidad', formatCurrency(utilidad, moneda)]);
            costData.push(['Total AIU', formatCurrency(totalAIU, moneda)]);
        }
        costData.push(['IVA (19%)', formatCurrency(iva, moneda)]);
        costData.push(['Total', formatCurrency(total, moneda)]);
        costData.push(['Anticipo', formatCurrency(valorAnticipo, moneda)]);
        doc.autoTable({
            startY: yPos,
            body: costData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: marginLeft, right: marginLeft }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Condiciones', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Forma de Pago: ${formaPago}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Porcentaje de Anticipo: ${porcentajeAnticipo}%`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Fecha de Anticipo: ${fechaAnticipo}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Importación: ${importacion}`, marginLeft, yPos);
        if (importacion === 'Sí') {
            yPos += 5;
            doc.text(`Tiempo de Importación: ${tiempoImportacion} días`, marginLeft, yPos);
        }
        yPos += 5;
        doc.text(`Fecha de Llegada Material: ${fechaLlegadaMaterial}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Tiempo de Planeación: ${tiempoPlaneacion} semanas`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Tiempo de Fabricación y Despacho: ${tiempoFabricacionDespacho} semanas`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Tiempo de Instalación: ${tiempoInstalacion} meses`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Fecha Final: ${fechaFinal}`, marginLeft, yPos);

        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const pdfContent = btoa(pdfBase64);
        const pdfPath = `${PDF_FOLDER}/${consecutivo}.pdf`;

        let pdfSha = null;
        try {
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${pdfPath}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (response.status !== 404) {
                const data = await response.json();
                pdfSha = data.sha;
            }
        } catch (error) {
            console.error('Error al verificar PDF existente en GitHub:', error);
        }

        let gitHubSuccess = true;
        try {
            await saveFileToGitHub(pdfPath, pdfContent, `Subir PDF para cotización ${consecutivo}`, pdfSha);
        } catch (error) {
            gitHubSuccess = false;
            showToast('No se pudo guardar el PDF en GitHub. Guardando localmente como respaldo.', 'warning');
        }

        const { content: jsonContent, sha: jsonSha } = await fetchCotizacionesFromGitHub();
        let cotizaciones = [];
        if (jsonContent && jsonContent.trim().length > 0) {
            try {
                cotizaciones = JSON.parse(atob(jsonContent));
                if (!Array.isArray(cotizaciones)) {
                    cotizaciones = [];
                }
            } catch (parseError) {
                console.error('Error al parsear cotizaciones existentes:', parseError);
                cotizaciones = [];
            }
        }

        const nuevaCotizacion = {
            "consecutivo": consecutivo,
            "nombreCliente": nombreCliente,
            "proyecto": proyecto,
            "descripcion": descripcion,
            "moneda": moneda,
            "tasaCambio": tasaCambio,
            "conAIU": conAIU,
            "administrativo": administrativo,
            "imprevistos": imprevistos,
            "utilidad": utilidad,
            "formaPago": formaPago,
            "porcentajeAnticipo": porcentajeAnticipo,
            "fechaAnticipo": fechaAnticipo,
            "importacion": importacion,
            "tiempoImportacion": tiempoImportacion,
            "fechaLlegadaMaterial": fechaLlegadaMaterial,
            "tiempoPlaneacion": tiempoPlaneacion,
            "tiempoFabricacionDespacho": tiempoFabricacionDespacho,
            "tiempoInstalacion": tiempoInstalacion,
            "fechaFinal": fechaFinal,
            "items": items,
            "pdfPath": pdfPath,
            "fechaCreacion": today
        };
        cotizaciones.push(nuevaCotizacion);

        const jsonString = JSON.stringify(cotizaciones);
        if (!jsonString) {
            throw new Error('No se pudo serializar la cotización a JSON.');
        }

        if (gitHubSuccess) {
            try {
                await saveFileToGitHub(COTIZACIONES_JSON_PATH, btoa(jsonString), `Actualizar cotizaciones con ${consecutivo}`, jsonSha);
            } catch (error) {
                gitHubSuccess = false;
                showToast('No se pudo guardar la cotización en GitHub. Guardando localmente como respaldo.', 'warning');
            }
        }

        if (!gitHubSuccess) {
            let localCotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
            localCotizaciones.push(nuevaCotizacion);
            localStorage.setItem('cotizaciones', JSON.stringify(localCotizaciones));
            localStorage.setItem(`pdf_${consecutivo}`, pdfContent);
        }

        showToast('Cotización guardada exitosamente.', 'success');
        descargarPDFCotizacion(consecutivo, pdfContent);
        await actualizarConsecutivo();
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        showToast('Error al guardar cotización: ' + error.message, 'error');
    }
}

// Funciones que dependen del DOM
function inicializarTokenUI() {
    const tokenFieldContainer = document.createElement('div');
    tokenFieldContainer.style.margin = '10px 0';
    tokenFieldContainer.innerHTML = `
        <label for="githubTokenInput">Token de GitHub: </label>
        <input type="text" id="githubTokenInput" value="${GITHUB_TOKEN}" readonly style="width: 300px;">
    `;
    document.body.insertBefore(tokenFieldContainer, document.body.firstChild);
}

function inicializarListenersEditables() {
    const inputsEditables = document.querySelectorAll('.editable');
    inputsEditables.forEach(input => {
        input.removeEventListener('input', () => window.calcularCotizacion());
        input.addEventListener('input', () => {
            if (window.cotizacionFullyLoaded) {
                window.calcularCotizacion();
            } else {
                console.warn('Esperando inicialización completa de cotizacion.js antes de calcular.');
                showToast('Cotización aún cargando. Por favor, espere un momento e intente de nuevo.', 'warning');
            }
        });
    });

    const fechaAnticipo = document.getElementById('fechaAnticipo');
    const importacion = document.getElementById('importacion');
    const tiempoImportacion = document.getElementById('tiempoImportacion');
    const tiempoPlaneacion = document.getElementById('tiempoPlaneacion');
    const tiempoFabricacionDespacho = document.getElementById('tiempoFabricacionDespacho');
    const tiempoInstalacion = document.getElementById('tiempoInstalacion');

    if (fechaAnticipo) fechaAnticipo.addEventListener('change', window.calcularFechaLlegadaMaterial);
    if (importacion) importacion.addEventListener('change', window.toggleTiempoImportacion);
    if (tiempoImportacion) tiempoImportacion.addEventListener('input', window.calcularFechaLlegadaMaterial);
    if (tiempoPlaneacion) tiempoPlaneacion.addEventListener('input', window.calcularFechaFinal);
    if (tiempoFabricacionDespacho) tiempoFabricacionDespacho.addEventListener('input', window.calcularFechaFinal);
    if (tiempoInstalacion) tiempoInstalacion.addEventListener('input', window.calcularFechaFinal);
}

// Inicialización que depende del DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Establecer la bandera al inicio
    window.cotizacionFullyLoaded = false;

    // Verificar dependencias
    if (typeof showToast !== 'function') {
        console.error('La función showToast no está definida. Asegúrese de incluir la librería correspondiente.');
        showToast = (message, type = 'error') => alert(`${type.toUpperCase()}: ${message}`);
    }
    if (typeof window.jspdf === 'undefined') {
        console.error('La librería jsPDF no está cargada. Asegúrese de incluir <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script> en index.html.');
    }

    try {
        // Validar el formato del token de GitHub
        if (!GITHUB_TOKEN || (!GITHUB_TOKEN.startsWith('ghp_') && !GITHUB_TOKEN.startsWith('gghp_'))) {
            throw new Error('El token de GitHub no tiene un formato válido. Asegúrese de que comience con "ghp_" o "gghp_".');
        }

        // Reasignar todas las funciones globales con sus implementaciones completas
        window.agregarItemCotizacion = agregarItemCotizacion;
        window.eliminarItemCotizacion = eliminarItemCotizacion;
        window.toggleAIU = toggleAIU;
        window.toggleAIUFields = toggleAIUFields;
        window.actualizarTasaCambio = actualizarTasaCambio;
        window.calcularCotizacion = calcularCotizacion;
        window.toggleTiempoImportacion = toggleTiempoImportacion;
        window.calcularFechaLlegadaMaterial = calcularFechaLlegadaMaterial;
        window.calcularFechaFinal = calcularFechaFinal;
        window.guardarCotizacion = guardarCotizacion;
        window.generarPDFCotizacion = generarPDFCotizacion;

        inicializarTokenUI();
        inicializarListenersEditables();
        window.calcularCotizacion();

        // Ejecutar operaciones asíncronas en segundo plano
        await actualizarConsecutivo().catch(error => {
            console.error('Error al actualizar consecutivo en segundo plano:', error);
            showToast('No se pudo actualizar el consecutivo automáticamente. Usando valor local.', 'warning');
        });
    } catch (error) {
        console.error('Error crítico al inicializar cotizacion.js:', error);
        showToast('Error al cargar la cotización: ' + error.message, 'error');
    } finally {
        window.cotizacionFullyLoaded = true;
    }

    setTimeout(() => {
        if (!window.cotizacionFullyLoaded) {
            console.warn('Inicialización de cotizacion.js excedió el tiempo límite. Estableciendo window.cotizacionFullyLoaded a true.');
            window.cotizacionFullyLoaded = true;
        }
    }, 10000); // Aumentar a 10 segundos para dar más tiempo a las operaciones asíncronas
});
