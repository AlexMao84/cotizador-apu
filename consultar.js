function filtrarCotizaciones() {
    try {
        const buscar = document.getElementById('buscarCliente').value.toLowerCase();
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const tabla = document.getElementById('listaCotizaciones').getElementsByTagName('tbody')[0];
        tabla.innerHTML = '';

        cotizaciones
            .filter(cot => {
                const nombreCliente = (cot.nombreCliente || '').toLowerCase();
                const proyecto = (cot.proyecto || '').toLowerCase();
                const consecutivo = (cot.consecutivo || '').toLowerCase();
                return nombreCliente.includes(buscar) || proyecto.includes(buscar) || consecutivo.includes(buscar);
            })
            .forEach(cot => {
                const totalCantidad = cot.items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
                const row = tabla.insertRow();
                row.innerHTML = `
                    <td>${cot.consecutivo}</td>
                    <td>${cot.nombreCliente || 'Sin Cliente'}</td>
                    <td>${cot.proyecto || 'Sin Proyecto'}</td>
                    <td>${totalCantidad.toFixed(2)}</td>
                    <td>${formatCurrency(cot.precioTotal || 0, cot.moneda || 'COP')}</td>
                    <td>
                        <button class="action-btn" onclick="editarCotizacion('${cot.consecutivo}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn" onclick="eliminarCotizacion('${cot.consecutivo}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                    <td><button class="pdf-btn" onclick="descargarPDFCotizacion('${cot.consecutivo}')" title="Descargar PDF"><i class="fas fa-file-pdf"></i></button></td>
                `;
            });
    } catch (error) {
        console.error('Error al filtrar cotizaciones:', error);
        showToast('Error al filtrar cotizaciones: ' + error.message);
    }
}

function editarCotizacion(consecutivo) {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cot = cotizaciones.find(c => c.consecutivo === consecutivo);
        if (!cot) throw new Error('Cotización no encontrada.');

        document.getElementById('consecutivo').textContent = cot.consecutivo;
        document.getElementById('nombreCliente').value = cot.nombreCliente || '';
        document.getElementById('proyecto').value = cot.proyecto || '';
        document.getElementById('descripcion').value = cot.descripcion || '';
        document.getElementById('moneda').value = cot.moneda || 'COP';
        document.getElementById('tasaCambio').value = cot.tasaCambio || 1;
        document.getElementById('conAIU').checked = cot.conAIU || false;
        document.getElementById('administrativo').value = cot.administrativo || 0;
        document.getElementById('imprevistos').value = cot.imprevistos || 0;
        document.getElementById('utilidad').value = cot.utilidad || 0;
        document.getElementById('formaPago').value = cot.formaPago || 'Transferencia Bancaria';
        document.getElementById('porcentajeAnticipo').value = cot.porcentajeAnticipo || 0;
        document.getElementById('fechaAnticipo').value = cot.fechaAnticipo || '';
        document.getElementById('importacion').value = cot.importacion || 'No';
        document.getElementById('tiempoImportacion').value = cot.tiempoImportacion || 0;
        document.getElementById('fechaLlegadaMaterial').value = cot.fechaLlegadaMaterial || '';
        document.getElementById('tiempoPlaneacion').value = cot.tiempoPlaneacion || 0;
        document.getElementById('tiempoFabricacionDespacho').value = cot.tiempoFabricacionDespacho || 0;
        document.getElementById('tiempoInstalacion').value = cot.tiempoInstalacion || 0;
        document.getElementById('fechaFinal').value = cot.fechaFinal || '';

        const tabla = document.getElementById('tablaItemsCotizacion').getElementsByTagName('tbody')[0];
        tabla.innerHTML = '';
        cot.items.forEach(item => {
            const row = tabla.insertRow();
            row.innerHTML = `
                <td><input type="text" class="editable descripcion" value="${item.descripcion || ''}" required></td>
                <td><select class="editable unidad">
                    <option value="UND" ${item.unidad === 'UND' ? 'selected' : ''}>UND</option>
                    <option value="M2" ${item.unidad === 'M2' ? 'selected' : ''}>M2</option>
                    <option value="ML" ${item.unidad === 'ML' ? 'selected' : ''}>ML</option>
                </select></td>
                <td><input type="number" class="editable cantidad" value="${(item.cantidad || 0).toFixed(2)}" min="0" step="0.01" required></td>
                <td><input type="number" class="editable precioUnitario" value="${(item.precioUnitario || 0).toFixed(2)}" min="0" step="0.01" required></td>
                <td class="subtotal"></td>
                <td><button class="delete-btn" onclick="eliminarItemCotizacion(this)" title="Eliminar ítem"><i class="fas fa-trash"></i></button></td>
            `;
            row.querySelectorAll('.editable').forEach(input => input.addEventListener('input', calcularCotizacion));
        });

        cotizaciones.splice(cotizaciones.findIndex(c => c.consecutivo === consecutivo), 1);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
        openTab('cotizacion');
        calcularCotizacion();
    } catch (error) {
        console.error('Error al editar cotización:', error);
        showToast('Error al editar cotización: ' + error.message);
    }
}

function eliminarCotizacion(consecutivo) {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const index = cotizaciones.findIndex(c => c.consecutivo === consecutivo);
        if (index === -1) throw new Error('Cotización no encontrada.');
        cotizaciones.splice(index, 1);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
        filtrarCotizaciones();
        showToast('Cotización eliminada exitosamente.', 'success');
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        showToast('Error al eliminar cotización: ' + error.message);
    }
}

function descargarPDFCotizacion(consecutivo) {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cot = cotizaciones.find(c => c.consecutivo === consecutivo);
        if (!cot) throw new Error('Cotización no encontrada.');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Constantes para el diseño
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const lineHeight = 6;
        let y = margin;

        // Borde alrededor del contenido
        doc.setLineWidth(0.2);
        doc.setDrawColor(150, 150, 150);
        doc.rect(margin - 5, margin - 5, pageWidth - 2 * (margin - 5), pageHeight - 2 * (margin - 5));

        // Fondo del encabezado
        doc.setFillColor(220, 230, 240); // Gris-azul claro
        doc.rect(margin - 5, margin - 5, pageWidth - 2 * (margin - 5), 25, 'F');

        // Encabezado
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("SELCO Materiales Compuestos", pageWidth / 2, y, { align: "center" });
        y += lineHeight;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("Teléfono: (+57) 320 7303050 | Email: ventas@selco.com | www.selco.com.co", pageWidth / 2, y, { align: "center" });
        y += lineHeight + 5;

        // Título del documento
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Cotización", pageWidth / 2, y, { align: "center" });
		
        y += lineHeight + 5;

        // Fecha de emisión
        const today = new Date();
        const fechaEmision = today.toISOString().split('T')[0];
        const fechaVencimiento = new Date(today);
        fechaVencimiento.setDate(today.getDate() + 15); // Validez de 15 días
        const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Fecha de Emisión: ${fechaEmision}`, pageWidth - margin, y, { align: "right" });
        y += lineHeight + 5;

        // Línea divisoria
        doc.setLineWidth(0.3);
        doc.setDrawColor(30, 58, 138);
        doc.line(margin, y, pageWidth - margin, y);
        y += lineHeight;

        // Detalles de la cotización
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Detalles de la Cotización", margin, y);
        y += lineHeight + 2;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(`No.: ${cot.consecutivo}`, margin, y);
        y += lineHeight;
        doc.text(`Cliente: ${cot.nombreCliente || 'Sin Cliente'}`, margin, y);
        y += lineHeight;
        doc.text(`Proyecto: ${cot.proyecto || 'Sin Proyecto'}`, margin, y);
        y += lineHeight;
        doc.text(`Descripción: ${cot.descripcion || 'Sin Descripción'}`, margin, y, { maxWidth: pageWidth - 2 * margin });
        y += lineHeight * 2;

        // Tabla de ítems
        doc.autoTable({
            head: [['Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: cot.items.map(item => [
                item.descripcion || 'Sin Descripción',
                item.unidad || 'UND',
                (item.cantidad || 0).toFixed(2),
                formatCurrency(item.precioUnitario || 0, cot.moneda || 'COP'),
                formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0), cot.moneda || 'COP')
            ]),
            startY: y,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 2, textColor: [50, 50, 50], lineWidth: 0.1, lineColor: [150, 150, 150] },
            headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 15 },
                2: { cellWidth: 20 },
                3: { cellWidth: 35 },
                4: { cellWidth: 40 }
            }
        });

        y = doc.lastAutoTable.finalY + 10;

        // Resumen financiero
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Resumen Financiero", margin, y);
        y += lineHeight + 2;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const subtotal = cot.items.reduce((sum, i) => sum + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
        doc.text(`Subtotal General: ${formatCurrency(subtotal, cot.moneda || 'COP')}`, margin, y);
        y += lineHeight;

        if (cot.conAIU) {
            const administracion = (cot.administrativo / 100) * subtotal;
            const imprevistos = (cot.imprevistos / 100) * subtotal;
            const utilidad = (cot.utilidad / 100) * subtotal;
            const totalAIU = administracion + imprevistos + utilidad;

            doc.text(`Administración (${cot.administrativo}%): ${formatCurrency(administracion, cot.moneda || 'COP')}`, margin, y);
            y += lineHeight;
            doc.text(`Imprevistos (${cot.imprevistos}%): ${formatCurrency(imprevistos, cot.moneda || 'COP')}`, margin, y);
            y += lineHeight;
            doc.text(`Utilidad (${cot.utilidad}%): ${formatCurrency(utilidad, cot.moneda || 'COP')}`, margin, y);
            y += lineHeight;
            doc.text(`Total AIU: ${formatCurrency(totalAIU, cot.moneda || 'COP')}`, margin, y);
            y += lineHeight;
        }

        const iva = subtotal * 0.19;
        doc.text(`IVA (19%): ${formatCurrency(iva, cot.moneda || 'COP')}`, margin, y);
        y += lineHeight;
		doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Total: ${formatCurrency(cot.precioTotal || 0, cot.moneda || 'COP')}`, margin, y);
        y += lineHeight * 2;

        // Condiciones y tiempos (incluyendo todos los tiempos de entrega)
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Condiciones y Tiempos", margin, y);
        y += lineHeight + 2;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(`Fecha de Emisión: ${fechaEmision}`, margin, y);
        y += lineHeight;
        doc.text(`Fecha de Vencimiento: ${fechaVencimientoStr} (Validez: 15 días)`, margin, y);
        y += lineHeight;
        doc.text(`Importación: ${cot.importacion ? 'Sí' : 'No'}`, margin, y);
        y += lineHeight;
        doc.text(`Tiempo de Importación: ${cot.tiempoImportacion || '0'} días`, margin, y);
        y += lineHeight;
        doc.text(`Fecha de Llegada del Material: ${cot.fechaLlegadaMaterial || 'No Especificada'}`, margin, y);
        y += lineHeight;
        doc.text(`Planeación: ${cot.tiempoPlaneacion || '0'} semanas`, margin, y);
        y += lineHeight;
        doc.text(`Fabricación y Despacho: ${cot.tiempoFabricacionDespacho || '0'} semanas`, margin, y);
        y += lineHeight;
        doc.text(`Instalación: ${cot.tiempoInstalacion || '0'} meses`, margin, y);
        y += lineHeight;
        doc.text(`Fecha Final Estimada: ${cot.fechaFinal || 'No Especificada'}`, margin, y);
        y += lineHeight;
        doc.text(`Forma de Pago: ${cot.formaPago || 'No Especificada'}`, margin, y);
        y += lineHeight;
		doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Valor del Anticipo: ${formatCurrency(cot.valorAnticipo || 0, cot.moneda || 'COP')}`, margin, y);
        y += lineHeight * 2;

        // Notas legales
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Notas: Esta cotización es válida por 15 días a partir de la fecha de emisión. Precios sujetos a cambios sin previo aviso.", margin, y, { maxWidth: pageWidth - 2 * margin });

        // Pie de página con información adicional
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text("SELCO Materiales Compuestos | (+57) 320 7303050 | ventas@selco.com", margin, pageHeight - margin + 2);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - margin + 2, { align: "right" });
        }

        doc.save(`cotizacion_${cot.consecutivo}.pdf`);
    } catch (error) {
        console.error('Error al generar PDF de cotización:', error);
        showToast('Error al generar PDF: ' + error.message);
    }
}
function exportarCotizaciones() {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const blob = new Blob([JSON.stringify(cotizaciones, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cotizaciones.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al exportar cotizaciones:', error);
        showToast('Error al exportar cotizaciones: ' + error.message);
    }
}

function importarCotizaciones(files) {
    try {
        if (!files?.length) throw new Error('No se seleccionó archivo');
        const file = files[0];
        const reader = new FileReader();
        reader.onload = e => {
            const cotizaciones = JSON.parse(e.target.result);
            localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
            filtrarCotizaciones();
            showToast('Cotizaciones importadas exitosamente.', 'success');
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error al importar cotizaciones:', error);
        showToast('Error al importar cotizaciones: ' + error.message);
    }
}