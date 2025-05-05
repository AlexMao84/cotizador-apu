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
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', calcularCotizacion));
        calcularCotizacion();
    } catch (error) {
        console.error('Error al agregar ítem de cotización:', error);
        showToast('Error al agregar ítem: ' + error.message);
    }
}

function eliminarItemCotizacion(button) {
    try {
        button.closest('tr').remove();
        calcularCotizacion();
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
        calcularCotizacion();
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
        calcularCotizacion();
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
        for (let fila of filas) {
            const cantidad = parseFloat(fila.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(fila.querySelector('.precioUnitario').value) || 0;
            if (cantidad <= 0) {
                document.getElementById('cantidadError').classList.add('active');
                document.getElementById('cantidadError').textContent = 'La cantidad debe ser mayor a 0.';
                return;
            }
            const subtotal = cantidad * precio;
            fila.querySelector('.subtotal').textContent = formatCurrency(subtotal);
            subtotalGeneral += subtotal;
        }
        document.getElementById('cantidadError').classList.remove('active');

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
            return;
        }
        document.getElementById('tasaCambioError').classList.remove('active');

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
            calcularFechaFinal();
            return;
        }
        const importacion = document.getElementById('importacion').value;
        let dias = 0;
        if (importacion === 'Sí') {
            dias = parseInt(document.getElementById('tiempoImportacion').value) || 0;
        }
        const fecha = new Date(fechaAnticipo);
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
        fecha.setDate(fecha.getDate() + planeacion + fabricacion + instalacion);
        fechaFinalInput.value = fecha.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error al calcular fecha final:', error);
        showToast('Error al calcular fecha final: ' + error.message);
    }
}

function actualizarConsecutivo() {
    try {
        // Obtener las cotizaciones de localStorage
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        
        // Validar que cotizaciones sea un arreglo
        if (!Array.isArray(cotizaciones)) {
            throw new Error('Los datos de cotizaciones en localStorage no son un arreglo válido.');
        }

        let ultimoConsecutivo = 25040000; // Valor inicial por defecto

        // Si hay cotizaciones, buscar el mayor consecutivo
        if (cotizaciones.length > 0) {
            ultimoConsecutivo = cotizaciones
                .filter(cot => cot && cot.consecutivo && typeof cot.consecutivo === 'string' && cot.consecutivo.startsWith('SEL'))
                .reduce((max, cot) => {
                    const num = parseInt(cot.consecutivo.replace('SEL', '')) || 0;
                    return Math.max(max, num);
                }, 25040000);
        }

        // Generar el nuevo consecutivo
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

function guardarCotizacion() {
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

        // Configuración de márgenes y estilos
        const marginLeft = 10;
        const marginTop = 10;
        let yPos = marginTop;

        // Encabezado
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

        // Información del Cliente y Proyecto
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

        // Tabla de Ítems
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

        // Costos Adicionales (AIU, IVA, Total)
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
        doc.autoTable({
            startY: yPos,
            head: [['Concepto', 'Valor']],
            body: costData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [50, 50, 50] },
            margin: { left: marginLeft, right: marginLeft }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        // Anticipo
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Anticipo', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Porcentaje: ${porcentajeAnticipo}%`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Valor: ${formatCurrency(parseFloat(document.getElementById('valorAnticipo').textContent.replace(/[^0-9.]/g, '')) || 0, moneda)}`, marginLeft, yPos);
        yPos += 10;

        // Fechas
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Cronograma', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de Anticipo: ${fechaAnticipo || 'No especificada'}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Fecha de Llegada de Material: ${fechaLlegadaMaterial || 'No especificada'}`, marginLeft, yPos);
        yPos += 5;
        doc.text(`Fecha Final Estimada: ${fechaFinal || 'No especificada'}`, marginLeft, yPos);
        yPos += 10;

        // Forma de Pago
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Forma de Pago', marginLeft, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Método: ${formaPago}`, marginLeft, yPos);

        // Guardar el PDF
        const pdfFileName = `cotizacion_${consecutivo}.pdf`;
        doc.save(pdfFileName);

        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cotizacion = {
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
            items,
            formaPago,
            porcentajeAnticipo,
            valorAnticipo: parseFloat(document.getElementById('valorAnticipo').textContent.replace(/[^0-9.]/g, '')) || 0,
            fechaAnticipo,
            importacion,
            tiempoImportacion,
            fechaLlegadaMaterial,
            tiempoPlaneacion,
            tiempoFabricacionDespacho,
            tiempoInstalacion,
            fechaFinal,
            precioTotal: parseFloat(document.getElementById('precioTotal').textContent.replace(/[^0-9.]/g, '')) || 0,
            pdfPath: pdfFileName
        };

        cotizaciones.push(cotizacion);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
        showToast('Cotización guardada y PDF generado exitosamente.', 'success');
        actualizarConsecutivo();
        document.getElementById('nombreCliente').value = '';
        document.getElementById('proyecto').value = '';
        document.getElementById('descripcion').value = '';
        tabla.innerHTML = '';
        calcularCotizacion();
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        showToast('Error al guardar cotización: ' + error.message);
    }
}

// Inicializar event listeners para cálculos automáticos de fechas
document.addEventListener('DOMContentLoaded', () => {
    try {
        const camposFecha = ['fechaAnticipo', 'tiempoImportacion', 'tiempoPlaneacion', 'tiempoFabricacionDespacho', 'tiempoInstalacion'];
        camposFecha.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('input', () => {
                    calcularFechaLlegadaMaterial();
                    calcularFechaFinal();
                });
            }
        });
        const importacionSelect = document.getElementById('importacion');
        if (importacionSelect) {
            importacionSelect.addEventListener('change', () => {
                toggleTiempoImportacion();
                calcularFechaLlegadaMaterial();
                calcularFechaFinal();
            });
        }
    } catch (error) {
        console.error('Error al inicializar listeners de fechas:', error);
        showToast('Error al configurar cálculos de fechas: ' + error.message);
    }
});