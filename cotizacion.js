window.cotizacionLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Definir todas las constantes al inicio del bloque
        let GITHUB_TOKEN = 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; // Este token debe ser reemplazado por uno válido
        const REPO_OWNER = alexmao84;
        const REPO_NAME = cotizador-apu;
        const COTIZACIONES_JSON_PATH = cotizaciones.json;
        const PDF_FOLDER = cotizaciones_pdf;

        // Permitir al usuario configurar el token dinámicamente
        function setGitHubToken(token) {
            GITHUB_TOKEN = token;
        }

        // Función para inicializar o actualizar listeners de los elementos editables
        function inicializarListenersEditables() {
            const inputsEditables = document.querySelectorAll('.editable');
            inputsEditables.forEach(input => {
                input.removeEventListener('input', () => window.calcularCotizacion());
                input.addEventListener('input', () => {
                    if (typeof window.calcularCotizacion === 'function') {
                        window.calcularCotizacion();
                    } else {
                        console.error('calcularCotizacion no está definida al editar.');
                        showToast('Error: calcularCotizacion no está definida.');
                    }
                });
            });

            // Agregar listeners específicos para campos de fechas y tiempos
            const fechaAnticipo = document.getElementById('fechaAnticipo');
            const importacion = document.getElementById('importacion');
            const tiempoImportacion = document.getElementById('tiempoImportacion');
            const tiempoPlaneacion = document.getElementById('tiempoPlaneacion');
            const tiempoFabricacionDespacho = document.getElementById('tiempoFabricacionDespacho');
            const tiempoInstalacion = document.getElementById('tiempoInstalacion');

            fechaAnticipo.addEventListener('change', window.calcularFechaLlegadaMaterial);
            importacion.addEventListener('change', window.toggleTiempoImportacion);
            tiempoImportacion.addEventListener('input', window.calcularFechaLlegadaMaterial);
            tiempoPlaneacion.addEventListener('input', window.calcularFechaFinal);
            tiempoFabricacionDespacho.addEventListener('input', window.calcularFechaFinal);
            tiempoInstalacion.addEventListener('input', window.calcularFechaFinal);
        }

        // Funciones para interactuar con GitHub
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
                    throw new Error('Credenciales inválidas. Por favor, actualice el token de GitHub.');
                }
                const data = await response.json();
                return { content: data.content, sha: data.sha };
            } catch (error) {
                console.error('Error al cargar cotizaciones desde GitHub:', error);
                showToast('Error al cargar cotizaciones desde GitHub: ' + error.message);
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
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Código ${response.status}: ${response.statusText} - ${errorData.message || 'Sin detalles'}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error al guardar en GitHub:', error);
                showToast(`Error al guardar en GitHub: ${error.message}`);
                throw error;
            }
        }

        // Funciones de la interfaz de cotización
        function agregarItemCotizacion() {
            try {
                const tabla = document.getElementById('tablaItemsCotizacion').getElementsByTagName('tbody')[0];
                const newRow = tabla.insertRow();
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
                showToast('Error al agregar ítem: ' + error.message);
            }
        }

        function eliminarItemCotizacion(button) {
            try {
                button.closest('tr').remove();
                window.calcularCotizacion();
            } catch (error) {
                console.error('Error al eliminar ítem de cotización:', error);
                showToast('Error al eliminar ítem: ' + error.message);
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
                showToast('Error al alternar AIU: ' + error.message);
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
                showToast('Error al alternar campos AIU: ' + error.message);
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
                showToast('Error al actualizar tasa de cambio: ' + error.message);
            }
        }

        function calcularCotizacion() {
            try {
                const tabla = document.getElementById('tablaItemsCotizacion');
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

                calcularFechaLlegadaMaterial();
                calcularFechaFinal();
            } catch (error) {
                console.error('Error al calcular cotización:', error);
                showToast('Error al calcular cotización: ' + error.message);
                calcularFechaLlegadaMaterial();
                calcularFechaFinal();
            }
        }

        function toggleTiempoImportacion() {
            try {
                const importacion = document.getElementById('importacion').value;
                document.getElementById('tiempoImportacionField').classList.toggle('hidden', importacion === 'No');
                calcularFechaLlegadaMaterial();
            } catch (error) {
                console.error('Error al alternar tiempo de importación:', error);
                showToast('Error al alternar tiempo de importación: ' + error.message);
            }
        }

        function calcularFechaLlegadaMaterial() {
            try {
                const fechaAnticipo = document.getElementById('fechaAnticipo').value;
                const fechaLlegadaInput = document.getElementById('fechaLlegadaMaterial');
                if (!fechaAnticipo) {
                    fechaLlegadaInput.value = '';
                    showToast('Por favor, ingrese la fecha de anticipo para calcular las fechas.', 'warning');
                    calcularFechaFinal();
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
                    calcularFechaFinal();
                    return;
                }
                fecha.setDate(fecha.getDate() + dias);
                fechaLlegadaInput.value = fecha.toISOString().split('T')[0];
                calcularFechaFinal();
            } catch (error) {
                console.error('Error al calcular fecha de llegada:', error);
                showToast('Error al calcular fecha de llegada: ' + error.message);
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
                showToast('Error al calcular fecha final: ' + error.message);
            }
        }

        async function actualizarConsecutivo() {
            try {
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

                let ultimoConsecutivo = 25040000;
                if (cotizaciones.length > 0) {
                    ultimoConsecutivo = cotizaciones
                        .filter(cot => cot && cot.consecutivo && typeof cot.consecutivo === 'string' && cot.consecutivo.startsWith('SEL'))
                        .reduce((max, cot) => {
                            const num = parseInt(cot.consecutivo.replace('SEL', '')) || 0;
                            return Math.max(max, num);
                        }, 25040000);
                }

                const nuevoConsecutivo = `SEL${ultimoConsecutivo + 1}`;
                document.getElementById('consecutivo').textContent = nuevoConsecutivo;
                return nuevoConsecutivo;
            } catch (error) {
                console.error('Error al actualizar consecutivo:', error);
                showToast('Error al actualizar consecutivo: ' + error.message);
                const fallbackConsecutivo = 'SEL25040001';
                document.getElementById('consecutivo').textContent = fallbackConsecutivo;
                return fallbackConsecutivo;
            }
        }

        async function guardarCotizacion() {
            try {
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
                const items = Array.from(tabla.rows).map(row => ({
                    descripcion: row.querySelector('.descripcion').value || 'Ítem Sin Descripción',
                    unidad: row.querySelector('.unidad').value,
                    cantidad: parseFloat(row.querySelector('.cantidad').value) || 0,
                    precioUnitario: parseFloat(row.querySelector('.precioUnitario').value) || 0,
                    subtotal: (parseFloat(row.querySelector('.cantidad').value) || 0) * (parseFloat(row.querySelector('.precioUnitario').value) || 0)
                }));

                if (!items.length || !nombreCliente || !proyecto) {
                    showToast('Complete los campos requeridos: Cliente, Proyecto e Ítems.');
                    return;
                }

                // Generar PDF
                const { jsPDF } = window.jspdf;
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
                const costData = [
                    ['Subtotal', formatCurrency(parseFloat(document.getElementById('precioUnitarioCantidad').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]
                ];
                if (conAIU) {
                    costData.push(['Administración', formatCurrency(parseFloat(document.getElementById('valorAdministrativo').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]);
                    costData.push(['Imprevistos', formatCurrency(parseFloat(document.getElementById('valorImprevistos').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]);
                    costData.push(['Utilidad', formatCurrency(parseFloat(document.getElementById('valorUtilidad').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]);
                    costData.push(['Total AIU', formatCurrency(parseFloat(document.getElementById('valorAIU').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]);
                }
                costData.push(['IVA (19%)', formatCurrency(parseFloat(document.getElementById('iva').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]);
                costData.push(['Total', formatCurrency(parseFloat(document.getElementById('precioTotal').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)]);
                costData.push(['Anticipo', formatCurrency(parseFloat(document.getElementById('valorAnticipo').textContent.replace(/[^0-0.]/g, '')) || 0, moneda)]);
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
                    cotizaciones = JSON.parse(atob(jsonContent));
                    if (!Array.isArray(cotizaciones)) {
                        cotizaciones = [];
                    }
                }
                const nuevaCotizacion = {
                    consecutivo,
                    nombreCliente,
                    proyecto,
                    descripcion,
                    moneda,
                    tasaCambio,
                    conAIU,
                    administrativo,
                    imprevistos,
                    utilidad,
                    formaPago,
                    porcentajeAnticipo,
                    fechaAnticipo,
                    importacion,
                    tiempoImportacion,
                    fechaLlegadaMaterial,
                    tiempoPlaneacion,
                    tiempoFabricacionDespacho,
                    tiempoInstalacion,
                    fechaFinal,
                    items,
                    pdfPath,
                    fechaCreacion: today
                };
                cotizaciones.push(nuevaCotizacion);

                if (gitHubSuccess) {
                    try {
                        await saveFileToGitHub(COTIZACIONES_JSON_PATH, btoa(JSON.stringify(cotizaciones)), `Actualizar cotizaciones con ${consecutivo}`, jsonSha);
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
            } catch (error) {
                console.error('Error al guardar cotización:', error);
                showToast('Error al guardar cotización: ' + error.message);
            }
        }

        // Exponer funciones globalmente
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

        // Inicializar la cotización al cargar
        await actualizarConsecutivo();
        inicializarListenersEditables();
        calcularCotizacion();
    } catch (error) {
        console.error('Error crítico al inicializar cotizacion.js:', error);
        showToast('Error al cargar la cotización: ' + error.message);
    } finally {
        window.cotizacionLoaded = true;
    }
});

function formatCurrency(amount, currency = 'COP') {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency
    }).format(amount);
}
