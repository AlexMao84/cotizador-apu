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
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Cotización', 10, 10);
        doc.setFontSize(12);
        doc.text(`Consecutivo: ${cot.consecutivo}`, 10, 20);
        doc.text(`Cliente: ${cot.nombreCliente || 'Sin Cliente'}`, 10, 30);
        doc.text(`Proyecto: ${cot.proyecto || 'Sin Proyecto'}`, 10, 40);
        doc.text(`Descripción: ${cot.descripcion || 'Sin Descripción'}`, 10, 50);

        doc.autoTable({
            head: [['Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: cot.items.map(item => [
                item.descripcion || 'Sin Descripción',
                item.unidad || 'UND',
                (item.cantidad || 0).toFixed(2),
                formatCurrency(item.precioUnitario || 0, cot.moneda || 'COP'),
                formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0), cot.moneda || 'COP')
            ]),
            startY: 60
        });

        let y = doc.lastAutoTable.finalY + 10;
        doc.text(`Subtotal General: ${formatCurrency(cot.items.reduce((sum, i) => sum + (i.cantidad || 0) * (i.precioUnitario || 0), 0), cot.moneda || 'COP')}`, 10, y);
        y += 10;
        if (cot.conAIU) {
            const subtotal = cot.items.reduce((sum, i) => sum + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
            const administracion = (cot.administrativo / 100) * subtotal;
            const imprevistos = (cot.imprevistos / 100) * subtotal;
            const utilidad = (cot.utilidad / 100) * subtotal;
            doc.text(`Administración: ${formatCurrency(administracion, cot.moneda || 'COP')}`, 10, y);
            y += 10;
            doc.text(`Imprevistos: ${formatCurrency(imprevistos, cot.moneda || 'COP')}`, 10, y);
            y += 10;
            doc.text(`Utilidad: ${formatCurrency(utilidad, cot.moneda || 'COP')}`, 10, y);
            y += 10;
            doc.text(`Total AIU: ${formatCurrency(administracion + imprevistos + utilidad, cot.moneda || 'COP')}`, 10, y);
            y += 10;
        }
        doc.text(`IVA (19%): ${formatCurrency(cot.items.reduce((sum, i) => sum + (i.cantidad || 0) * (i.precioUnitario || 0), 0) * 0.19, cot.moneda || 'COP')}`, 10, y);
        y += 10;
        doc.text(`Total: ${formatCurrency(cot.precioTotal || 0, cot.moneda || 'COP')}`, 10, y);
        y += 10;
        doc.text(`Forma de Pago: ${cot.formaPago || 'No Especificada'}`, 10, y);
        y += 10;
        doc.text(`Valor del Anticipo: ${formatCurrency(cot.valorAnticipo || 0, cot.moneda || 'COP')}`, 10, y);
        y += 10;
        doc.text(`Fecha Final Estimada: ${cot.fechaFinal || 'No Especificada'}`, 10, y);

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